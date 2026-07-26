"use client";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  errorBoxClass,
  inputClass,
  OtpField,
  successBoxClass,
} from "@/components/auth/otp-field";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { isOtpComplete, normalizeOtpInput } from "@/lib/otp";
import { createClient } from "@/lib/supabase";
import { BindEmailSection } from "@/components/auth/bind-email-section";
import { BindPhoneSection } from "@/components/auth/bind-phone-section";
import { ChangePasswordSection } from "@/components/auth/change-password-section";
import { isPhoneAuthEnabled } from "@/lib/phone-auth-feature";
import { maskPhone } from "@/lib/phone";
import { Mail, Shield } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";

const phoneAuthOn = isPhoneAuthEnabled();

export default function AccountSettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);

  const [identityVerified, setIdentityVerified] = useState(false);
  const [currentOtp, setCurrentOtp] = useState("");
  const [currentOtpMsg, setCurrentOtpMsg] = useState("");
  const [currentOtpErr, setCurrentOtpErr] = useState("");
  const [currentOtpLoading, setCurrentOtpLoading] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const previousEmailRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  async function refreshUser() {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  }

  async function sendCurrentEmailOtp(): Promise<boolean> {
    setCurrentOtpErr("");
    setCurrentOtpMsg("");
    if (!user?.email) {
      setCurrentOtpErr("当前账户未绑定邮箱");
      return false;
    }
    const res = await fetch("/api/auth/password-otp/send", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    if (!res.ok) {
      setCurrentOtpErr(data.error ?? "发送验证码失败");
      return false;
    }
    setCurrentOtpMsg(data.message ?? `验证码已发送至 ${user.email}`);
    return true;
  }

  async function verifyCurrentEmail(e: React.FormEvent) {
    e.preventDefault();
    setCurrentOtpErr("");
    setCurrentOtpMsg("");
    if (!user?.email) {
      setCurrentOtpErr("当前账户未绑定邮箱");
      return;
    }
    if (!isOtpComplete(currentOtp)) {
      setCurrentOtpErr("请输入完整的邮箱验证码");
      return;
    }

    setCurrentOtpLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: user.email,
      token: currentOtp,
      type: "recovery",
    });
    setCurrentOtpLoading(false);

    if (error) {
      setCurrentOtpErr(getAuthErrorMessage(error));
      return;
    }

    setIdentityVerified(true);
    setCurrentOtpMsg("身份已确认，请填写新邮箱并获取验证码");
    setCurrentOtp("");
  }

  async function sendEmailChangeOtp(): Promise<boolean> {
    setEmailErr("");
    setEmailMsg("");
    if (!identityVerified) {
      setEmailErr("请先验证当前邮箱");
      return false;
    }
    if (!newEmail || !newEmail.includes("@")) {
      setEmailErr("请输入有效的新邮箱");
      return false;
    }
    if (user?.email && newEmail.trim().toLowerCase() === user.email.toLowerCase()) {
      setEmailErr("新邮箱不能与当前邮箱相同");
      return false;
    }

    previousEmailRef.current = user?.email ?? null;

    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      setEmailErr(getAuthErrorMessage(error));
      return false;
    }
    setEmailMsg(`验证码已发送至 ${newEmail}`);
    return true;
  }

  async function confirmEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailErr("");
    setEmailMsg("");
    setEmailLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: newEmail,
      token: emailOtp,
      type: "email_change",
    });

    if (verifyError) {
      setEmailErr(getAuthErrorMessage(verifyError));
      setEmailLoading(false);
      return;
    }

    await fetch("/api/auth/sync-profile", { method: "POST" });
    await fetch("/api/auth/email-change/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        previousEmail: previousEmailRef.current,
      }),
    });

    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    setEmailLoading(false);
    setEmailMsg("邮箱已更新，其他设备登录已失效，原邮箱已收到变更通知");
    setIdentityVerified(false);
    setNewEmail("");
    setEmailOtp("");
    previousEmailRef.current = null;
  }

  return (
    <DashboardShell
      title="账户设置"
      description={
        phoneAuthOn
          ? "修改登录密码；绑定邮箱与手机号后，可使用任一方式与同一密码登录"
          : "修改登录密码与注册邮箱；换绑前须验证当前邮箱"
      }
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Shield className="h-4 w-4 text-accent" />
            当前账户
          </div>
          <p className="mt-2 text-sm">
            邮箱：
            <span className="font-medium text-foreground">
              {user?.email ?? "未绑定"}
            </span>
          </p>
          {phoneAuthOn && (
            <p className="mt-1 text-sm">
              手机：
              <span className="font-medium text-foreground">
                {user?.phone ? maskPhone(user.phone) : "未绑定"}
              </span>
            </p>
          )}
        </div>

        <ChangePasswordSection
          email={user?.email}
          phone={phoneAuthOn ? user?.phone : null}
        />

        {phoneAuthOn && (
          <>
            <BindEmailSection email={user?.email} onBound={refreshUser} />
            <BindPhoneSection phone={user?.phone} onBound={refreshUser} />
          </>
        )}

        <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold">
            <Mail className="h-5 w-5 text-accent" />
            修改注册邮箱
          </h2>
          <p className="mt-1 text-xs text-muted">
            第一步验证<strong>当前邮箱</strong>，第二步向<strong>新邮箱</strong>
            发送验证码；更换成功后其他登录会话将失效，原邮箱会收到通知。
          </p>

          {!identityVerified ? (
            <>
              {currentOtpErr && (
                <div className={`${errorBoxClass} mt-3`}>{currentOtpErr}</div>
              )}
              {currentOtpMsg && (
                <div className={`${successBoxClass} mt-3`}>{currentOtpMsg}</div>
              )}
              <form className="mt-4 space-y-3" onSubmit={verifyCurrentEmail}>
                <p className="text-sm text-muted">
                  当前邮箱：{user?.email ?? "未绑定"}
                </p>
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    placeholder="当前邮箱验证码"
                    value={currentOtp}
                    onChange={(e) =>
                      setCurrentOtp(normalizeOtpInput(e.target.value))
                    }
                    disabled={!user?.email}
                  />
                  <OtpField
                    onSend={sendCurrentEmailOtp}
                    disabled={!user?.email}
                  />
                </div>
                <button
                  type="submit"
                  disabled={
                    currentOtpLoading ||
                    !isOtpComplete(currentOtp) ||
                    !user?.email
                  }
                  className="w-full rounded-lg bg-accent/10 py-2.5 text-sm font-semibold text-accent-dark hover:bg-accent/15 disabled:opacity-50"
                >
                  {currentOtpLoading ? "验证中..." : "确认当前邮箱"}
                </button>
              </form>
            </>
          ) : (
            <>
              {emailErr && (
                <div className={`${errorBoxClass} mt-3`}>{emailErr}</div>
              )}
              {emailMsg && (
                <div className={`${successBoxClass} mt-3`}>{emailMsg}</div>
              )}
              <form className="mt-4 space-y-3" onSubmit={confirmEmailChange}>
                <input
                  type="email"
                  className={inputClass}
                  placeholder="新邮箱地址"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    placeholder="新邮箱验证码"
                    value={emailOtp}
                    onChange={(e) =>
                      setEmailOtp(normalizeOtpInput(e.target.value))
                    }
                  />
                  <OtpField onSend={sendEmailChangeOtp} disabled={!newEmail} />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIdentityVerified(false);
                      setEmailErr("");
                      setEmailMsg("");
                      setNewEmail("");
                      setEmailOtp("");
                    }}
                    className="flex-1 rounded-lg border border-border py-2.5 text-sm text-muted hover:bg-accent/5"
                  >
                    重新验证身份
                  </button>
                  <button
                    type="submit"
                    disabled={emailLoading || !isOtpComplete(emailOtp)}
                    className="flex-1 rounded-lg bg-accent/10 py-2.5 text-sm font-semibold text-accent-dark hover:bg-accent/15 disabled:opacity-50"
                  >
                    {emailLoading ? "更新中..." : "确认更换邮箱"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
