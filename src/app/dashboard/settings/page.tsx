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
import { ChangePasswordSection } from "@/components/auth/change-password-section";
import { Mail, Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

export default function AccountSettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  async function sendEmailChangeOtp(): Promise<boolean> {
    setEmailErr("");
    setEmailMsg("");
    if (!newEmail || !newEmail.includes("@")) {
      setEmailErr("请输入有效的新邮箱");
      return false;
    }
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
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    setEmailLoading(false);
    setEmailMsg("邮箱已更新");
    setNewEmail("");
    setEmailOtp("");
  }

  return (
    <DashboardShell
      title="账户设置"
      description="修改登录密码与注册邮箱；改密与换绑均需邮箱验证码"
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
        </div>

        <ChangePasswordSection
          email={user?.email}
          successMessage="登录密码已修改成功"
        />

        <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold">
            <Mail className="h-5 w-5 text-accent" />
            修改注册邮箱
          </h2>
          <p className="mt-1 text-xs text-muted">
            将向<strong>新邮箱</strong>发送验证码，验证通过后完成更换
          </p>
          {emailErr && <div className={`${errorBoxClass} mt-3`}>{emailErr}</div>}
          {emailMsg && <div className={`${successBoxClass} mt-3`}>{emailMsg}</div>}
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
                placeholder="邮箱验证码"
                value={emailOtp}
                onChange={(e) => setEmailOtp(normalizeOtpInput(e.target.value))}
              />
              <OtpField onSend={sendEmailChangeOtp} disabled={!newEmail} />
            </div>
            <button
              type="submit"
              disabled={emailLoading || !isOtpComplete(emailOtp)}
              className="w-full rounded-lg bg-accent/10 py-2.5 text-sm font-semibold text-accent-dark hover:bg-accent/15 disabled:opacity-50"
            >
              {emailLoading ? "更新中..." : "确认更换邮箱"}
            </button>
          </form>
        </div>
      </div>
    </DashboardShell>
  );
}
