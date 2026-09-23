"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function RedeemPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("请输入兑换码");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error);
      return;
    }

    toast.success(`兑换成功，已添加 ${data.credits} 积分`);
    window.dispatchEvent(new Event("credits-updated"));
    setCode("");
  }

  return (
    <div className="container mx-auto px-4 py-5 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">兑换积分</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          使用站点管理员提供的兑换码充值积分。
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>输入兑换码</CardTitle>
            <CardDescription>将站点管理员提供的兑换码粘贴到下方</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRedeem} className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="请输入兑换码"
                className="h-10 min-w-0 flex-1 font-mono"
              />
              <Button type="submit" className="h-10 shrink-0 sm:w-28" disabled={loading}>
                {loading ? "兑换中..." : "兑换"}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
