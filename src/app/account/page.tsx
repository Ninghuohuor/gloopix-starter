import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "个人信息" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, role: true, credits: true, createdAt: true },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">个人信息</h1>

      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>账号信息</CardTitle>
            <CardDescription>查看当前登录账号和积分状态。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="text-muted-foreground">当前邮箱</div>
              <div className="mt-1 break-all font-medium">{user.email}</div>
            </div>
            <div>
              <div className="text-muted-foreground">账号角色</div>
              <div className="mt-1 font-medium">
                {user.role === "ADMIN" ? "管理员" : "普通用户"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">当前积分</div>
              <div className="mt-1 font-medium">{user.credits} 积分</div>
            </div>
            <div>
              <div className="text-muted-foreground">注册时间</div>
              <div className="mt-1 font-medium">
                {new Date(user.createdAt).toLocaleString("zh-CN")}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>修改密码</CardTitle>
            <CardDescription>
              密码至少 8 位，并包含大小写字母和特殊符号。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
