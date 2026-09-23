import { auth } from "@/auth";
import { UNAUTHORIZED_ADMIN_REDIRECT_PATH } from "@/lib/route-targets";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";

const adminNavItems = [
  { href: "/admin", label: "概览" },
  { href: "/admin/codes", label: "兑换码管理" },
  { href: "/admin/users", label: "用户管理" },
  { href: "/admin/prompts", label: "提示词管理" },
  { href: "/admin/announcements", label: "公告管理" },
  { href: "/admin/settings", label: "站点设置" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect(UNAUTHORIZED_ADMIN_REDIRECT_PATH);
  }

  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 py-5 sm:flex-row sm:gap-6 sm:py-8">
      <AdminNav items={adminNavItems} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
