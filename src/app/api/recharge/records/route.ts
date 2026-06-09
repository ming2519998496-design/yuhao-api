import { getSessionUser } from "@/lib/auth-admin";
import {
  createPendingRechargeRecord,
  listUserRechargeRecords,
} from "@/lib/recharge-records-db";
import { uploadRechargeProof } from "@/lib/storage-recharge-proof";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

/** 当前用户的充值记录列表 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { records, error } = await listUserRechargeRecords(admin, user.id);

  if (error) {
    if (error.includes("recharge_records")) {
      return NextResponse.json({
        records: [],
        hint: "请在 Supabase SQL Editor 中 Create a new snippet 并 Run supabase-recharge-records.sql（见 docs/supabase-sql-editor-only.md）",
      });
    }
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ records });
}

/** 用户提交充值：须上传转账凭证，金额由管理员核对凭证后填写 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }

  const amountRaw = formData.get("amount");
  const amount =
    amountRaw === null || amountRaw === "" ? 0 : Number(amountRaw);
  const method = String(formData.get("method") ?? "");
  const proof = formData.get("proof");

  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "无效的充值金额" }, { status: 400 });
  }
  if (method !== "alipay" && method !== "wechat" && method !== "combined") {
    return NextResponse.json({ error: "无效的支付方式" }, { status: 400 });
  }
  if (!(proof instanceof File) || proof.size === 0) {
    return NextResponse.json(
      { error: "请先完成转账并上传转账成功截图，未转账请勿提交" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // 同一用户仅允许一笔待确认订单，避免重复刷单
  const { count: pendingCount } = await admin
    .from("recharge_records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "pending");

  if ((pendingCount ?? 0) > 0) {
    return NextResponse.json(
      { error: "您已有待确认的充值订单，请等待管理员处理后再提交" },
      { status: 400 }
    );
  }

  const uploaded = await uploadRechargeProof(admin, user.id, proof);
  if ("error" in uploaded) {
    return NextResponse.json({ error: uploaded.error }, { status: 500 });
  }

  const { record, error } = await createPendingRechargeRecord(admin, {
    userId: user.id,
    amount,
    method,
    proofUrl: uploaded.url,
  });

  if (!record || error) {
    const message = error ?? "创建充值记录失败";
    const hint =
      message.includes("proof_url")
        ? "请在 Supabase SQL Editor 中执行 supabase-recharge-proof.sql"
        : message.includes("recharge_records_method_check") ||
            message.includes("violates check constraint")
          ? "请在 Supabase SQL Editor 中执行 supabase-recharge-records-fix-combined.sql"
          : message.includes("recharge_records") &&
              (message.includes("does not exist") ||
                message.includes("schema cache"))
            ? "请在 Supabase SQL Editor 中执行 supabase-recharge-records.sql"
            : undefined;
    return NextResponse.json({ error: message, hint }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: `订单 ${record.orderNo} 已提交，管理员核对凭证后入账`,
    record,
  });
}
