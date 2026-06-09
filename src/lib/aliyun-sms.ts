import crypto from "crypto";

const ENDPOINT = "https://dysmsapi.aliyuncs.com/";

function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/\+/g, "%20")
    .replace(/\*/g, "%2A")
    .replace(/%7E/g, "~");
}

function signRpc(
  params: Record<string, string>,
  accessKeySecret: string,
  method: string
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join("&");
  const stringToSign = `${method}&${percentEncode("/")}&${percentEncode(sorted)}`;
  return crypto
    .createHmac("sha1", `${accessKeySecret}&`)
    .update(stringToSign)
    .digest("base64");
}

/** E.164 → 阿里云国内号码 13800138000 */
export function toAliyunPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.startsWith("86") && digits.length === 13) return digits.slice(2);
  return digits;
}

export type SendAliyunSmsResult =
  | { ok: true; bizId?: string }
  | { ok: false; message: string };

/**
 * 发送阿里云短信验证码
 * 模板变量默认 key 为 code，可通过 ALIYUN_SMS_TEMPLATE_PARAM_KEY 修改
 */
export async function sendAliyunSms(
  phoneE164: string,
  code: string
): Promise<SendAliyunSmsResult> {
  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
  const signName = process.env.ALIYUN_SMS_SIGN_NAME;
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;
  const paramKey = process.env.ALIYUN_SMS_TEMPLATE_PARAM_KEY ?? "code";

  if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
    return {
      ok: false,
      message:
        "缺少阿里云短信环境变量：ALIYUN_ACCESS_KEY_ID、ALIYUN_ACCESS_KEY_SECRET、ALIYUN_SMS_SIGN_NAME、ALIYUN_SMS_TEMPLATE_CODE",
    };
  }

  const phone = toAliyunPhone(phoneE164);
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { ok: false, message: `无效的手机号格式: ${phoneE164}` };
  }

  const templateParam = JSON.stringify({ [paramKey]: code });
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const nonce = crypto.randomUUID();

  const params: Record<string, string> = {
    AccessKeyId: accessKeyId,
    Action: "SendSms",
    Format: "JSON",
    PhoneNumbers: phone,
    SignName: signName,
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: nonce,
    SignatureVersion: "1.0",
    TemplateCode: templateCode,
    TemplateParam: templateParam,
    Timestamp: timestamp,
    Version: "2017-05-25",
  };

  params.Signature = signRpc(params, accessKeySecret, "GET");

  const url = `${ENDPOINT}?${new URLSearchParams(params).toString()}`;

  try {
    const res = await fetch(url, { method: "GET" });
    const data = (await res.json()) as {
      Code?: string;
      Message?: string;
      BizId?: string;
    };

    if (data.Code === "OK") {
      return { ok: true, bizId: data.BizId };
    }

    return {
      ok: false,
      message: data.Message ?? data.Code ?? "阿里云短信发送失败",
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "请求阿里云失败",
    };
  }
}
