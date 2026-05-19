import { createClient } from "@supabase/supabase-js";

// 服务端专用客户端 — 使用 service_role key，有全部权限
// 仅在 API 路由中使用，绝不暴露给前端
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
