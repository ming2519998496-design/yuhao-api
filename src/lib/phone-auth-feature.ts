/**
 * 手机号注册/登录/绑定开关。默认关闭；短信资质就绪后设
 * NEXT_PUBLIC_PHONE_AUTH_ENABLED=true 并重新部署即可开放。
 */
export function isPhoneAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PHONE_AUTH_ENABLED === "true";
}
