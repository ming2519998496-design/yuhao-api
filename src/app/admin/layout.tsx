import { isUserAdmin, getSessionUser } from "@/lib/auth-admin";
import { redirect } from "next/navigation";

/** 管理后台：仅管理员可访问（服务端拦截） */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const admin = await isUserAdmin(user);
  if (!admin) {
    redirect("/dashboard");
  }

  return children;
}
