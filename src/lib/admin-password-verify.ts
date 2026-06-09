import { createClient } from "@supabase/supabase-js";

/** 校验管理员密码，不写入浏览器 Session（避免覆盖当前登录态） */
export async function verifyAdminPassword(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    return { ok: false, error: "服务端 Supabase 配置缺失" };
  }

  if (!email?.trim() || !password) {
    return { ok: false, error: "请提供邮箱与密码" };
  }

  const client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { ok: false, error: "管理员密码错误" };
  }

  return { ok: true };
}
