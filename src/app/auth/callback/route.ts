import {
  isUserFrozen,
} from "@/lib/account-frozen";
import { createClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user && (await isUserFrozen(data.user.id))) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL("/login?frozen=1", request.url)
      );
    }
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
