"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_STRENGTH_MESSAGE, passwordStrengthSchema } from "@/lib/validations";
import { toast } from "sonner";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

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

    const error = nextPassword === nextConfirmPassword ? "" : "两次输入的新密码不一致";
    setConfirmPasswordError(error);
    return !error;
  }

  function handlePasswordChange(nextPassword: string) {
    setNewPassword(nextPassword);
    validatePassword(nextPassword);
    validateConfirmPassword(nextPassword, confirmPassword);
  }

  function handleConfirmPasswordChange(nextConfirmPassword: string) {
    setConfirmPassword(nextConfirmPassword);
    validateConfirmPassword(newPassword, nextConfirmPassword);
  }

  async function handleSendCode() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      toast.error("请先输入邮箱");
      return;
    }

    setSendingCode(true);
    const res = await fetch("/api/auth/password-reset/request", {
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      toast.error("请输入邮箱");
      return;
    }

    if (!/^\d{6}$/.test(verificationCode.trim())) {
      toast.error("请输入6位邮箱验证码");
      return;
    }

    const passwordValidation = passwordStrengthSchema.safeParse(newPassword);
    if (!passwordValidation.success) {
      setPasswordError(passwordValidation.error.issues[0]?.message || PASSWORD_STRENGTH_MESSAGE);
      toast.error(PASSWORD_STRENGTH_MESSAGE);
      return;
    }

    if (!validateConfirmPassword(newPassword, confirmPassword)) {
      toast.error("两次输入的新密码不一致");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        verificationCode,
        newPassword,
        confirmPassword,
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      toast.error(data.error || "重置密码失败");
      return;
    }

    toast.success("密码已重置，请重新登录");
    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
          value={verificationCode}
          onChange={(event) => setVerificationCode(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">新密码</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          value={newPassword}
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
        <Label htmlFor="confirmPassword">确认新密码</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => handleConfirmPasswordChange(event.target.value)}
          placeholder="再次输入新密码"
          minLength={8}
          aria-invalid={Boolean(confirmPasswordError)}
          required
        />
        <p className={`text-xs ${confirmPasswordError ? "text-destructive" : "text-muted-foreground"}`}>
          {confirmPasswordError || "两次输入的新密码一致后即可重置"}
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "重置中..." : "重置密码"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        想起密码了？{" "}
        <Link href="/login" className="text-primary underline underline-offset-4">
          返回登录
        </Link>
      </p>
    </form>
  );
}
