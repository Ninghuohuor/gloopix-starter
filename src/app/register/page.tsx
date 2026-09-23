import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getPostLoginPath } from "@/lib/route-targets";
import { getPublicAppConfig } from "@/lib/api-settings";

export const metadata = {
  title: "注册",
};

export default async function RegisterPage() {
  const session = await auth();
  const appConfig = await getPublicAppConfig();
  if (session?.user) {
    redirect(getPostLoginPath(session.user.role));
  }

  return (
    <AuthPageShell title="注册" description={`创建帐号，开始使用 ${appConfig.branding.siteName}`}>
      {appConfig.features.registrationEnabled ? <RegisterForm /> : <div className="rounded-lg border bg-muted/30 p-4 text-center text-sm text-muted-foreground">当前站点暂未开放用户注册，请联系运营者。</div>}
      <p className="mt-4 text-center text-sm text-muted-foreground">
        已有帐号？{" "}
        <Link href="/login" className="text-primary underline">
          立即登录
        </Link>
      </p>
    </AuthPageShell>
  );
}
