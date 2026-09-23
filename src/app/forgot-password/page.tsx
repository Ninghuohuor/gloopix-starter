import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getPostLoginPath } from "@/lib/route-targets";

export const metadata = {
  title: "重置密码",
};

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session?.user) {
    redirect(getPostLoginPath(session.user.role));
  }

  return (
    <AuthPageShell title="重置密码" description="通过邮箱验证码重置你的账号密码">
      <ForgotPasswordForm />
      <p className="mt-3 text-center text-xs text-muted-foreground">
        重置密码即表示你同意{" "}
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
