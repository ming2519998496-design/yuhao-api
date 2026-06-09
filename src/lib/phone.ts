/** 将用户输入规范为 E.164（默认中国大陆 +86） */
export function formatPhoneE164(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("86") && digits.length >= 13) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+86${digits}`;
  if (input.trim().startsWith("+")) return `+${digits}`;
  return `+86${digits}`;
}

export function isValidChinaMobile(input: string): boolean {
  const e164 = formatPhoneE164(input);
  return /^\+861[3-9]\d{9}$/.test(e164);
}

export function maskPhone(e164: string): string {
  const m = e164.match(/^\+86(\d{3})\d{4}(\d{4})$/);
  if (m) return `+86 ${m[1]}****${m[2]}`;
  return e164;
}
