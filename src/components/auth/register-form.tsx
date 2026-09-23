"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPostLoginPath } from "@/lib/route-targets";
import { PASSWORD_STRENGTH_MESSAGE, passwordStrengthSchema } from "@/lib/validations";
import { toast } from "sonner";

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function handleSendCode() {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      toast.error("请先输入邮箱");
      return;
    }

    setSendingCode(true);
    const res = await fetch("/api/auth/email-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail }),
    });
    const data = await res.json();
    setSendingCode(false);

    if (!res.ok) {
      toast.error(data.error || "验证码发送失败");
      return;
    }

    setCooldown(60);
    toast.success("验证码已发送，请查看邮箱");
  }

  function validatePassword(nextPassword: string) {
    if (!nextPassword) {
      setPasswordError("");
      return true;
    }

    const passwordValidation = passwordStrengthSchema.safeParse(nextPassword);
    const error = passwordValidation.success
      ? ""
      : passwordValidation.error.issues[0]?.message || PASSWORD_STRENGTH_MESSAGE;
    setPasswordError(error);
    return passwordValidation.success;
  }

  function validateConfirmPassword(nextPassword: string, nextConfirmPassword: string) {
    if (!nextConfirmPassword) {
      setConfirmPasswordError("");
      return true;
    }

    const error = nextPassword === nextConfirmPassword ? "" : "两次输入的密码不一致";
    setConfirmPasswordError(error);
    return !error;
  }

  function handlePasswordChange(nextPassword: string) {
    setPassword(nextPassword);
    validatePassword(nextPassword);
    validateConfirmPassword(nextPassword, confirmPassword);
  }

  function handleConfirmPasswordChange(nextConfirmPassword: string) {
    setConfirmPassword(nextConfirmPassword);
    validateConfirmPassword(password, nextConfirmPassword);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const verificationCode = formData.get("verificationCode") as string;

    if (!name.trim()) {
      toast.error("请输入昵称");
      return;
    }

    if (!email.trim()) {
      toast.error("请输入邮箱");
      return;
    }

    const passwordValidation = passwordStrengthSchema.safeParse(password);
    if (!passwordValidation.success) {
      setPasswordError(passwordValidation.error.issues[0]?.message || PASSWORD_STRENGTH_MESSAGE);
      toast.error(PASSWORD_STRENGTH_MESSAGE);
      return;
    }

    if (!validateConfirmPassword(password, confirmPassword)) {
      toast.error("两次输入的密码不一致");
      return;
    }

    if (!/^\d{6}$/.test(verificationCode.trim())) {
      toast.error("请输入6位邮箱验证码");
      return;
    }

    if (!acceptedTerms) {
      setTermsError("请先阅读并同意用户协议和隐私政策");
      toast.error("请先阅读并同意用户协议和隐私政策");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, verificationCode, acceptedTerms }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error || "注册失败");
      setLoading(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (signInResult?.error) {
      toast.error("注册成功，但自动登录失败，请手动登录");
      setLoading(false);
      return;
    }

    toast.success("注册成功");
    const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
    const session = await sessionRes.json();
    setLoading(false);
    router.push(getPostLoginPath(session?.user?.role));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="name">昵称</Label>
        <Input
          id="name"
          name="name"
          placeholder="你的昵称"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">邮箱</Label>
        <div className="flex gap-2">
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            disabled={sendingCode || cooldown > 0}
            onClick={handleSendCode}
          >
            {cooldown > 0 ? `${cooldown}s` : sendingCode ? "发送中..." : "发送验证码"}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="verificationCode">邮箱验证码</Label>
        <Input
          id="verificationCode"
          name="verificationCode"
          inputMode="numeric"
          maxLength={6}
          placeholder="6位验证码"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">密码</Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => handlePasswordChange(event.target.value)}
          placeholder="至少 8 位，含大小写和特殊符号"
          minLength={8}
          aria-invalid={Boolean(passwordError)}
          required
        />
        <p className={`text-xs ${passwordError ? "text-destructive" : "text-muted-foreground"}`}>
          {passwordError || PASSWORD_STRENGTH_MESSAGE}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">确认密码</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => handleConfirmPasswordChange(event.target.value)}
          placeholder="再次输入密码"
          minLength={8}
          aria-invalid={Boolean(confirmPasswordError)}
          required
        />
        <p className={`text-xs ${confirmPasswordError ? "text-destructive" : "text-muted-foreground"}`}>
          {confirmPasswordError || "两次输入的密码一致后即可注册"}
        </p>
      </div>
      <div className="space-y-2">
        <label
          className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm transition-colors ${
            termsError
              ? "border-destructive text-destructive"
              : "border-border text-muted-foreground"
          }`}
        >
          <input
            type="checkbox"
            name="acceptedTerms"
            checked={acceptedTerms}
            onChange={(event) => {
              setAcceptedTerms(event.target.checked);
              if (event.target.checked) setTermsError("");
            }}
            className="mt-1 size-4 shrink-0 accent-primary"
            aria-invalid={Boolean(termsError)}
            required
          />
          <span>
            我已阅读并同意{" "}
            <Link href="/terms" target="_blank" className="text-primary underline underline-offset-4">
              《用户协议》
            </Link>
            {" "}和{" "}
            <Link href="/privacy" target="_blank" className="text-primary underline underline-offset-4">
              《隐私政策》
            </Link>
          </span>
        </label>
        {termsError && <p className="text-xs text-destructive">{termsError}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "注册中..." : "注册"}
      </Button>
    </form>
  );
}
