import { createBrowserClient } from "@supabase/ssr";

/** 仅用于 Vercel build 预渲染阶段占位，避免 env 未注入时整站 build 失败 */
const BUILD_STUB_URL = "https://placeholder.supabase.co";
const BUILD_STUB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

function resolvePublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

  if (url && key) {
    return { url, key };
  }

  // next build 预渲染 /console 等页面时若读不到 env，用占位通过编译
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return { url: BUILD_STUB_URL, key: BUILD_STUB_KEY };
  }

  return { url: url || BUILD_STUB_URL, key: key || BUILD_STUB_KEY };
}

export function createClient() {
  const { url, key } = resolvePublicSupabaseConfig();
  return createBrowserClient(url, key);
}
