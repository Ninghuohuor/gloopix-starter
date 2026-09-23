import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getPostLoginPath } from "@/lib/route-targets";

export const metadata = {
  title: "登录",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect(getPostLoginPath(session.user.role));
  }

  return (
    <AuthPageShell title="登录" description="登录你的账号，开始创作">
      <LoginForm />
      <p className="mt-4 text-center text-sm text-muted-foreground">
        还没有帐号？{" "}
        <Link href="/register" className="text-primary underline">
          立即注册
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        登录即表示你同意{" "}
        <Link href="/terms" className="text-primary underline underline-offset-4">
          《用户协议》
        </Link>
        {" "}和{" "}
        <Link href="/privacy" className="text-primary underline underline-offset-4">
          《隐私政策》
        </Link>
      </p>
    </AuthPageShell>
  );
}
