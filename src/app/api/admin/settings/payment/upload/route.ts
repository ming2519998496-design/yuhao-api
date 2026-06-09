import { requireAdmin } from "@/lib/auth-admin";
import {
  ensurePaymentQrBucket,
  PAYMENT_QR_BUCKET,
} from "@/lib/storage-payment";
import { createAdminClient } from "@/lib/supabase-admin";
import type { PaymentChannel } from "@/lib/payment-settings";
import { NextResponse } from "next/server";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "无效表单" }, { status: 400 });
  }

  const file = formData.get("file");
  const channel = formData.get("channel");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择图片文件" }, { status: 400 });
  }

  if (channel !== "alipay" && channel !== "wechat" && channel !== "combined") {
    return NextResponse.json({ error: "无效支付渠道" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "仅支持 JPG、PNG、WebP、GIF" },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "图片不能超过 2MB" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const bucketReady = await ensurePaymentQrBucket(admin);
  if (!bucketReady.ok) {
    return NextResponse.json(
      {
        error: `无法创建 Storage 桶：${bucketReady.error}。请在 Supabase Dashboard → Storage 手动新建公开桶「${PAYMENT_QR_BUCKET}」，或执行 supabase-storage-payment.sql`,
      },
      { status: 500 }
    );
  }

  const ext =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "png";
  const path = `${channel as PaymentChannel}/${auth.user!.id}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage.from(PAYMENT_QR_BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = admin.storage.from(PAYMENT_QR_BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: data.publicUrl, path });
}
