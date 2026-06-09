import crypto from "crypto";
import type {
  CreateOnlinePaymentInput,
  OnlinePaymentProvider,
  VerifiedNotifyData,
} from "@/lib/payment/types";

function md5(text: string): string {
  return crypto.createHash("md5").update(text, "utf8").digest("hex");
}

function formatPrice(yuan: number): string {
  return yuan.toFixed(2);
}

function mapPayType(method: CreateOnlinePaymentInput["method"]): string {
  return method === "alipay" ? "alipay" : "native";
}

function buildCreateSign(params: {
  name: string;
  payType: string;
  price: string;
  orderId: string;
  notifyUrl: string;
  secret: string;
}): string {
  return md5(
    params.name +
      params.payType +
      params.price +
      params.orderId +
      params.notifyUrl +
      params.secret
  );
}

function buildNotifySign(params: {
  aoid: string;
  orderId: string;
  payPrice: string;
  payTime: string;
  secret: string;
}): string {
  return md5(
    params.aoid +
      params.orderId +
      params.payPrice +
      params.payTime +
      params.secret
  );
}

export function createXorPayProvider(aid: string, secret: string): OnlinePaymentProvider {
  return {
    id: "xorpay",

    async createPayment(input) {
      const name = input.productName ?? "遇好API 余额充值";
      const payType = mapPayType(input.method);
      const price = formatPrice(input.amountYuan);
      const sign = buildCreateSign({
        name,
        payType,
        price,
        orderId: input.orderNo,
        notifyUrl: input.notifyUrl,
        secret,
      });

      const body = new URLSearchParams({
        name,
        pay_type: payType,
        price,
        order_id: input.orderNo,
        notify_url: input.notifyUrl,
        sign,
      });
      if (input.orderUid) {
        body.set("order_uid", input.orderUid);
      }

      const res = await fetch(`https://xorpay.com/api/pay/${aid}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        info?: { qr?: string; h5?: string; aoid?: string };
        msg?: string;
      };

      if (!res.ok || data.status !== "ok" || !data.info?.qr) {
        return {
          ok: false,
          error: data.msg ?? `XorPay 下单失败 (${res.status})`,
        };
      }

      let payRedirectUrl = data.info.qr;
      if (input.method === "alipay" && !payRedirectUrl.startsWith("alipays://")) {
        payRedirectUrl = `alipays://platformapi/startapp?appId=20000067&url=${encodeURIComponent(data.info.qr)}`;
      }

      return {
        ok: true,
        payRedirectUrl,
        providerPayload: {
          qr: data.info.qr,
          h5: data.info.h5 ?? null,
          aoid: data.info.aoid ?? null,
          pay_type: payType,
        },
      };
    },

    verifyNotify(payload, appSecret) {
      const aoid = payload.aoid ?? "";
      const orderNo = payload.order_id ?? "";
      const payPrice = payload.pay_price ?? "";
      const payTime = payload.pay_time ?? "";
      const sign = payload.sign ?? "";

      if (!aoid || !orderNo || !payPrice || !payTime || !sign) {
        return { ok: false, error: "回调参数不完整" };
      }

      const expected = buildNotifySign({
        aoid,
        orderId: orderNo,
        payPrice,
        payTime,
        secret: appSecret,
      });

      if (expected !== sign) {
        return { ok: false, error: "回调签名校验失败" };
      }

      const paidAmountYuan = Number(payPrice);
      if (!Number.isFinite(paidAmountYuan) || paidAmountYuan <= 0) {
        return { ok: false, error: "回调金额无效" };
      }

      let externalTradeId: string | undefined;
      if (payload.detail) {
        try {
          const detail = JSON.parse(payload.detail) as { transaction_id?: string };
          externalTradeId = detail.transaction_id;
        } catch {
          /* ignore */
        }
      }

      const data: VerifiedNotifyData = {
        externalOrderId: aoid,
        orderNo,
        paidAmountYuan,
        paidAt: payTime,
        externalTradeId,
        raw: payload,
      };

      return { ok: true, data };
    },
  };
}
