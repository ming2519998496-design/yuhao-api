"use client";

import {
  errorBoxClass,
  inputClass,
  OtpField,
  successBoxClass,
} from "@/components/auth/otp-field";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { isOtpComplete, normalizeOtpInput } from "@/lib/otp";
import { formatPhoneE164, isValidChinaMobile, maskPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase";
import { Smartphone } from "lucide-react";
import { useMemo, useState } from "react";

type BindPhoneSectionProps = {
  phone: string | null | undefined;
  onBound: () => void;
};

export function BindPhoneSection({ phone, onBound }: BindPhoneSectionProps) {
  const supabase = useMemo(() => createClient(), []);
  const [newPhone, setNewPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"idle" | "verify">("idle");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const phoneE164 = useMemo(() => formatPhoneE164(newPhone), [newPhone]);

  if (phone) {
    return (
      <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold">
          <Smartphone className="h-5 w-5 text-accent" />
          绑定手机号
        </h2>
        <p className="mt-2 text-sm text-muted">
          已绑定：<span className="font-medium text-foreground">{maskPhone(phone)}</span>
        </p>
        <p className="mt-1 text-xs text-muted">
          可使用此手机号与注册密码登录同一账户
        </p>
      </div>
    );
  }

  async function sendBindOtp(): Promise<boolean> {
    setErr("");
    setMsg("");
    if (!isValidChinaMobile(newPhone)) {
      setErr("请输入有效的中国大陆手机号");
      return false;
    }

    const { error } = await supabase.auth.updateUser({ phone: phoneE164 });
    if (error) {
      setErr(getAuthErrorMessage(error));
      return false;
    }

    setStep("verify");
    setMsg(`验证码已发送至 ${maskPhone(phoneE164)}`);
    return true;
  }

  async function confirmBind(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (!isOtpComplete(otp)) {
      setErr("请输入完整的短信验证码");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: phoneE164,
      token: otp,
      type: "phone_change",
    });
    setLoading(false);

    if (error) {
      setErr(getAuthErrorMessage(error));
      return;
    }

    await fetch("/api/auth/sync-profile", { method: "POST" });
    setMsg("手机号已绑定");
    setOtp("");
    setNewPhone("");
    setStep("idle");
    onBound();
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
      <h2 className="flex items-center gap-2 font-semibold">
        <Smartphone className="h-5 w-5 text-accent" />
        绑定手机号
      </h2>
      <p className="mt-1 text-xs text-muted">
        绑定后可使用手机号与当前密码登录；验证码将发送至新手机号
      </p>

      {err && <div className={`${errorBoxClass} mt-3`}>{err}</div>}
      {msg && <div className={`${successBoxClass} mt-3`}>{msg}</div>}

      {step === "idle" ? (
        <div className="mt-4 space-y-3">
          <input
            type="tel"
            className={inputClass}
            placeholder="11 位中国大陆手机号"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
          />
          <button
            type="button"
            onClick={() => void sendBindOtp()}
            disabled={!newPhone}
            className="w-full rounded-lg bg-accent/10 py-2.5 text-sm font-semibold text-accent-dark hover:bg-accent/15 disabled:opacity-50"
          >
            获取验证码
          </button>
        </div>
      ) : (
        <form className="mt-4 space-y-3" onSubmit={confirmBind}>
          <p className="text-sm text-muted">发送至 {maskPhone(phoneE164)}</p>
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="短信验证码"
              value={otp}
              onChange={(e) => setOtp(normalizeOtpInput(e.target.value))}
            />
            <OtpField onSend={sendBindOtp} disabled={!newPhone} />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStep("idle");
                setOtp("");
                setErr("");
              }}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm text-muted hover:bg-accent/5"
            >
              重新填写
            </button>
            <button
              type="submit"
              disabled={loading || !isOtpComplete(otp)}
              className="flex-1 rounded-lg bg-accent/10 py-2.5 text-sm font-semibold text-accent-dark hover:bg-accent/15 disabled:opacity-50"
            >
              {loading ? "绑定中..." : "确认绑定"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
