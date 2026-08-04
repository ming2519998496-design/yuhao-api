/**
 * 平台 API 错误码目录（OpenAI 兼容：error.type + 可选 error.code）
 * 文档页 `/docs/errors` 与运行时响应共用此表。
 */

export type ApiErrorEntry = {
  /** 稳定错误码；优先读 error.code，否则可读 error.type */
  code: string;
  /** OpenAI 风格 type 字段 */
  type: string;
  http: number;
  title: string;
  description: string;
  hint: string;
};

export const API_ERROR_CATALOG: ApiErrorEntry[] = [
  {
    code: "missing_api_key",
    type: "auth_error",
    http: 401,
    title: "未提供 API Key",
    description: "请求头缺少 Authorization: Bearer <key>。",
    hint: "在令牌管理创建密钥，并按 Bearer 方式传递。",
  },
  {
    code: "invalid_api_key",
    type: "auth_error",
    http: 401,
    title: "无效的 API Key",
    description: "密钥不存在、格式错误或已删除。",
    hint: "检查是否复制完整 yh_… 密钥（仅创建时显示一次）。",
  },
  {
    code: "api_key_disabled",
    type: "auth_error",
    http: 401,
    title: "API Key 已禁用",
    description: "该密钥在控制台被关闭。",
    hint: "在令牌管理中重新启用，或换一把可用 Key。",
  },
  {
    code: "api_key_expired",
    type: "auth_error",
    http: 401,
    title: "API Key 已过期",
    description: "密钥超过有效期。",
    hint: "创建新密钥，或联系管理员调整有效期策略。",
  },
  {
    code: "model_required",
    type: "invalid_request_error",
    http: 400,
    title: "未指定模型",
    description: "请求体缺少 model，且 Key 未设置默认模型。",
    hint: "在请求中传入 model，或在创建 Key 时设置默认模型。",
  },
  {
    code: "model_not_found",
    type: "invalid_request_error",
    http: 400,
    title: "不支持的模型",
    description: "model id 不在当前平台目录中。",
    hint: "调用 GET /api/models 或查看价目页，使用已上架模型 id。",
  },
  {
    code: "wrong_api_kind",
    type: "invalid_request_error",
    http: 400,
    title: "端点与模型类型不匹配",
    description: "对话模型误走 generations，或图像/视频误走 chat/completions。",
    hint: "对话用 POST /v1/chat/completions；图像/视频用 POST /v1/generations。",
  },
  {
    code: "model_not_allowed",
    type: "permission_error",
    http: 403,
    title: "Key 无权使用该模型",
    description: "当前 Key 未授权该模型所在厂商分组。",
    hint: "在令牌管理中编辑 Key，勾选对应分组（OpenAI / Gemini / DeepSeek 等）。",
  },
  {
    code: "tools_not_supported",
    type: "invalid_request_error",
    http: 400,
    title: "Gemini 不支持 tools",
    description: "Google Gemini 路径拒绝客户端传入的 tools / tool_choice。",
    hint: "Agent / 工具调用请改用 OpenAI 或 DeepSeek 分组模型。",
  },
  {
    code: "web_search_not_supported",
    type: "invalid_request_error",
    http: 400,
    title: "不支持联网搜索",
    description: "当前模型不支持原生 webSearch（如 DeepSeek）。",
    hint: "改用 OpenAI / Gemini，或关闭联网搜索。",
  },
  {
    code: "payload_too_large",
    type: "invalid_request_error",
    http: 413,
    title: "请求体过大",
    description: "单次 chat/completions 请求体超过约 4 MB。",
    hint: "减少 tools 数量、缩短 description / 历史消息，或做摘要裁剪。",
  },
  {
    code: "insufficient_quota",
    type: "insufficient_quota",
    http: 402,
    title: "余额不足",
    description: "账户余额不足以完成预扣或结算补扣。",
    hint: "前往充值页充值；预扣按估算上限冻结，结束后按实际用量结算。",
  },
  {
    code: "rate_limit_exceeded",
    type: "rate_limit_error",
    http: 429,
    title: "请求过于频繁",
    description: "触发 Key / 用户 / IP 层速率限制。",
    hint: "降低并发；响应头 Retry-After 为建议等待秒数。",
  },
  {
    code: "web_origin_required",
    type: "forbidden_error",
    http: 403,
    title: "Web 功能需同源访问",
    description: "部分网站 API 仅允许从平台域名发起。",
    hint: "程序调用请使用 /v1 开放 API + Bearer Key，勿绕过站点鉴权。",
  },
  {
    code: "billing_error",
    type: "billing_error",
    http: 500,
    title: "计费结算异常",
    description: "预扣/结算过程出错（少见）。",
    hint: "确认余额充足后重试；持续失败请联系客服并提供请求时间。",
  },
  {
    code: "upstream_error",
    type: "upstream_error",
    http: 502,
    title: "上游服务商错误",
    description: "OpenAI / Google / DeepSeek 等上游返回失败或网络异常。",
    hint: "稍后重试；若仅某一厂商失败，可换其他分组模型。",
  },
  {
    code: "server_error",
    type: "server_error",
    http: 500,
    title: "服务器内部错误",
    description: "平台未捕获异常。",
    hint: "稍后重试；若可复现请联系客服。",
  },
];

export function getApiErrorByCode(code: string): ApiErrorEntry | undefined {
  return API_ERROR_CATALOG.find((e) => e.code === code);
}
