"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_STRENGTH_MESSAGE, passwordStrengthSchema } from "@/lib/validations";
import { toast } from "sonner";

export function ChangePasswordForm() {
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  function validateNewPassword(newPassword: string) {
    if (!newPassword) {
      setPasswordError("");
      return true;
    }

    const passwordValidation = passwordStrengthSchema.safeParse(newPassword);
    const error = passwordValidation.success
      ? ""
      : passwordValidation.error.issues[0]?.message || PASSWORD_STRENGTH_MESSAGE;
    setPasswordError(error);
    return passwordValidation.success;
  }

  function handleNewPasswordChange(newPassword: string) {
    setNewPassword(newPassword);
    validateNewPassword(newPassword);
    validateConfirmPassword(newPassword, confirmPassword);
  }

  function validateConfirmPassword(nextNewPassword: string, nextConfirmPassword: string) {
    if (!nextConfirmPassword) {
      setConfirmPasswordError("");
      return true;
    }

    const error = nextNewPassword === nextConfirmPassword ? "" : "两次输入的新密码不一致";
    setConfirmPasswordError(error);
    return !error;
  }

  function handleConfirmPasswordChange(nextConfirmPassword: string) {
    setConfirmPassword(nextConfirmPassword);
    validateConfirmPassword(newPassword, nextConfirmPassword);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const currentPassword = String(formData.get("currentPassword") || "");

    if (!currentPassword) {
      toast.error("请输入当前密码");
      return;
    }

    if (!validateNewPassword(newPassword)) {
      toast.error(PASSWORD_STRENGTH_MESSAGE);
      return;
    }

    if (!validateConfirmPassword(newPassword, confirmPassword)) {
      toast.error("两次输入的新密码不一致");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/user/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error || "密码修改失败");
      return;
    }

    form.reset();
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setConfirmPasswordError("");
    toast.success("密码已修改");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="currentPassword">当前密码</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">新密码</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          minLength={8}
          placeholder="至少 8 位，并包含大小写字母和特殊符号"
          onChange={(event) => handleNewPasswordChange(event.target.value)}
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
          autoComplete="new-password"
          value={confirmPassword}
          minLength={8}
          onChange={(event) => handleConfirmPasswordChange(event.target.value)}
          aria-invalid={Boolean(confirmPasswordError)}
          required
        />
        <p className={`text-xs ${confirmPasswordError ? "text-destructive" : "text-muted-foreground"}`}>
          {confirmPasswordError || "两次输入的新密码一致后即可保存"}
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "保存中..." : "修改密码"}
      </Button>
    </form>
  );
}
