/** 登录/注册后同步 profile，可附带邀请码 */
export function syncProfileClient(aff?: string | null) {
  const code = aff?.trim();
  if (code) {
    return fetch("/api/auth/sync-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aff: code }),
    });
  }
  return fetch("/api/auth/sync-profile", { method: "POST" });
}

export function getStoredAffCode(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("register_aff");
}

export function storeAffCode(code: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("register_aff", code.trim());
}

export function clearStoredAffCode() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("register_aff");
}
