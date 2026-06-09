"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { ChangePasswordSection } from "@/components/auth/change-password-section";
import { MAX_ADMIN_ACCOUNTS } from "@/lib/admin-policy";
import { createClient } from "@/lib/supabase";
import { Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

export default function AdminSecuritySettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  return (
    <AdminShell
      title="账户安全"
      description="修改管理员登录密码；全站仅允许最多 2 个管理员账户"
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
            <Shield className="h-4 w-4" />
            管理员账户限制
          </div>
          <p className="mt-2 text-sm text-muted">
            系统最多允许 <strong>{MAX_ADMIN_ACCOUNTS}</strong> 个管理账户，由服务器环境变量{" "}
            <code className="rounded bg-background px-1">ADMIN_EMAILS</code>{" "}
            配置（逗号分隔，不得超过 2 个邮箱）。无法通过后台界面新增第 3 个管理员。
          </p>
          <p className="mt-2 text-sm">
            当前登录：
            <span className="font-medium text-foreground">
              {user?.email ?? "未绑定邮箱"}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-elevated p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="h-4 w-4 text-accent" />
            管理员登录提醒
          </div>
          <p className="mt-2 text-sm text-muted">
            任一管理员成功登录管理后台时，系统会向{" "}
            <code className="rounded bg-background px-1">ADMIN_EMAILS</code>{" "}
            中配置的<strong>全部管理员邮箱</strong>发送登录提醒邮件，包含登录账号、时间、IP
            与设备信息。
          </p>
          <p className="mt-2 text-xs text-muted">
            需已配置 <code className="rounded bg-background px-1">RESEND_API_KEY</code>
            。关闭提醒：在服务器环境变量设置{" "}
            <code className="rounded bg-background px-1">ADMIN_LOGIN_ALERT=false</code>
            。
          </p>
        </div>

        <ChangePasswordSection
          email={user?.email}
          successMessage="管理员登录密码已修改成功"
        />
      </div>
    </AdminShell>
  );
}
