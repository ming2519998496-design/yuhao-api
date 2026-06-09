/** 邀请活动规则（展示与结算共用） */

export const FIRST_RECHARGE_MIN_YUAN = 50;
export const NEW_USER_FIRST_RECHARGE_BONUS_YUAN = 5;
export const REFERRAL_REWARD_RATE = 0.05;

export const REFERRAL_PROGRAM_HEADLINE =
  "新用户首充满 ¥50 送 ¥5 余额。";

export const REFERRAL_PROGRAM_INVITE_LINE =
  "邀请奖励：好友完成首充（单笔到账 ≥ ¥50）后，您与好友各得该笔首充金额 5% 的奖励（每账号限一次）。";

export const REFERRAL_PROGRAM_NOTES = [
  "首充指账号第一笔已到账充值；本活动替代原充值返佣，续充不再发放邀请奖励。",
  "奖励须划转为 API 余额后用于模型调用，不可提现。",
  "禁止恶意注册、自邀互邀等行为，平台有权取消奖励并限制账号。",
  "平台保留调整、暂停、终止活动及最终解释的权利。",
] as const;
