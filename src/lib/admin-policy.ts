/** 平台允许的管理员账户上限 */
export const MAX_ADMIN_ACCOUNTS = 2;

/** 从环境变量读取管理员邮箱白名单（最多 2 个） */
export function getAdminEmailList(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const emails = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return emails.slice(0, MAX_ADMIN_ACCOUNTS);
}

export function getAdminEmailSet(): Set<string> {
  return new Set(getAdminEmailList());
}

/** 环境变量是否配置了超过 2 个管理员邮箱 */
export function hasTooManyAdminEmailsInEnv(): boolean {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const count = raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean).length;
  return count > MAX_ADMIN_ACCOUNTS;
}
