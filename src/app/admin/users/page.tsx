"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isDisabled: boolean;
  credits: number;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  createdAt: string;
  _count: { images: number };
}

function formatAdminDateTime(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error("用户列表加载失败");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleToggleDisabled(user: AdminUser) {
    const nextDisabled = !user.isDisabled;
    setUpdatingUserId(user.id);

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDisabled: nextDisabled }),
    });

    const data = await res.json();
    setUpdatingUserId(null);

    if (!res.ok) {
      toast.error(data.error || "操作失败");
      return;
    }

    setUsers((prev) =>
      prev.map((item) => (item.id === user.id ? data.user : item))
    );
    toast.success(nextDisabled ? "账号已禁用" : "账号已启用");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">用户管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          查看注册用户、邮箱登录信息、积分和生成图片数量。
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">加载中...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">暂无用户</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>邮箱</TableHead>
                  <TableHead>昵称</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>积分</TableHead>
                  <TableHead>生成图片</TableHead>
                  <TableHead>最近活跃</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                        {user.role === "ADMIN" ? "管理员" : "用户"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.isDisabled ? (
                        <Badge variant="destructive">已禁用</Badge>
                      ) : (
                        <Badge variant="secondary">正常</Badge>
                      )}
                    </TableCell>
                    <TableCell>{user.credits}</TableCell>
                    <TableCell>{user._count.images}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatAdminDateTime(user.lastActiveAt || user.lastLoginAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatAdminDateTime(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={updatingUserId === user.id}
                        onClick={() => handleToggleDisabled(user)}
                      >
                        {user.isDisabled ? "启用账号" : "禁用账号"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
