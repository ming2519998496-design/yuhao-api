export type SupportContact = {
  email: string;
  qq: string;
  wechat: string;
  hours: string;
  note: string;
};

export function getSupportContact(): SupportContact {
  return {
    email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ?? "",
    qq: process.env.NEXT_PUBLIC_SUPPORT_QQ?.trim() || "2862600734",
    wechat: process.env.NEXT_PUBLIC_SUPPORT_WECHAT?.trim() ?? "",
    hours:
      process.env.NEXT_PUBLIC_SUPPORT_HOURS?.trim() ||
      "工作日 9:00-17:00（其余时间请留言，我们会尽快回复）",
    note:
      process.env.NEXT_PUBLIC_SUPPORT_NOTE?.trim() ||
      "充值、令牌、调用报错等问题，请说明注册邮箱与问题截图，便于我们快速处理。",
  };
}

export function hasSupportContact(contact: SupportContact): boolean {
  return Boolean(contact.email || contact.qq || contact.wechat);
}
