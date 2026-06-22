import { requireActiveUser } from "@/lib/account-frozen";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

/** 用户会话 API：要求已登录且未冻结 */
export async function requireActiveUserResponse(): Promise<
  { user: User; response: null } | { user: null; response: NextResponse }
> {
  const auth = await requireActiveUser();
  if (auth.status !== 200 || !auth.user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: auth.error, ...(auth.frozen ? { frozen: true } : {}) },
        { status: auth.status }
      ),
    };
  }
  return { user: auth.user, response: null };
}
