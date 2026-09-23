"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPostLoginPath } from "@/lib/route-targets";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function getLoginFailureMessage(email: string) {
    const res = await fetch("/api/auth/login-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) return "邮箱或密码错误";

    const status = await res.json();
    if (status.isLocked) {
      const minutes = Math.max(1, Math.ceil((status.remainingSeconds || 0) / 60));
      return `登录失败次数过多，账号已暂时锁定，请 ${minutes} 分钟后再试。`;
    }

    if (status.shouldSuggestPasswordReset) {
      return "邮箱或密码错误。失败次数较多，请点击“忘记密码”重置。";
    }

    return "邮箱或密码错误";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      toast.error(await getLoginFailureMessage(email));
      return;
    }

    toast.success("登录成功");
    const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
    const session = await sessionRes.json();
    router.push(getPostLoginPath(session?.user?.role));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">邮箱</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="your@email.com"
          required
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password">密码</Label>
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            忘记密码
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="至少8个字符"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "登录中..." : "登录"}
      </Button>
    </form>
  );
}
