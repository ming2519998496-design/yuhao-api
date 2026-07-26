import { isPhoneAuthEnabled } from "@/lib/phone-auth-feature";
import { requireActiveUserResponse } from "@/lib/session-api";
import { maskPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

/** 已登录用户（已绑手机）修改密码：向绑定手机发送短信验证码 */
export async function POST() {
  if (!isPhoneAuthEnabled()) {
    return NextResponse.json({ error: "手机号验证暂未开放" }, { status: 403 });
  }

  const auth = await requireActiveUserResponse();
  if (auth.response) return auth.response;
  const user = auth.user;

  if (!user.phone) {
    return NextResponse.json({ error: "未绑定手机号" }, { status: 400 });
  }

  const phone = user.phone;
  const admin = createAdminClient();

  const { error } = await admin.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: false },
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "发送验证码失败" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    phone,
    message: `验证码已发送至 ${maskPhone(phone)}`,
  });
}
