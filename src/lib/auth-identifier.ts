import { formatPhoneE164, isValidChinaMobile } from "@/lib/phone";

export type AuthIdentifier =
  | { kind: "email"; email: string }
  | { kind: "phone"; phone: string };

/** 判断输入更像手机号还是邮箱（无 @ 且符合大陆手机号） */
export function looksLikePhone(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || trimmed.includes("@")) return false;
  return isValidChinaMobile(trimmed) || trimmed.startsWith("+");
}

/**
 * 解析登录/账号标识：邮箱或手机号（默认大陆 +86）。
 * 无效输入返回 null。
 */
export function parseAuthIdentifier(input: string): AuthIdentifier | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return { kind: "email", email };
  }

  if (looksLikePhone(trimmed)) {
    const phone = formatPhoneE164(trimmed);
    if (!isValidChinaMobile(trimmed) && !/^\+[1-9]\d{6,14}$/.test(phone)) {
      return null;
    }
    return { kind: "phone", phone };
  }

  return null;
}
