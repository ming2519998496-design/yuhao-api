/** Supabase 邮箱 OTP 长度因项目配置可能为 6 或 8 位 */
export const OTP_MAX_LENGTH = 8;

export function normalizeOtpInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, OTP_MAX_LENGTH);
}

export function isOtpComplete(otp: string): boolean {
  return otp.length === 6 || otp.length === 8;
}
