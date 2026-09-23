"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Announcement {
  id: string;
  content: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: { email: string; name: string | null };
}

export default function AdminAnnouncementsPage() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

  const fetchAnnouncements = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/announcements")
      .then((r) => r.json())
      .then((d) => {
        setAnnouncement(d.announcement);
        setAnnouncements(d.announcements || []);
        setContent(d.announcement?.content || "");
        setImageUrl(d.announcement?.imageUrl || null);
        setLoading(false);
      })
      .catch(() => {
        toast.error("公告加载失败");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  async function handleSave() {
    const nextContent = content.trim();
    if (!nextContent) {
      toast.error("请输入公告内容");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: nextContent, imageUrl }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "保存失败");
        return;
      }

      toast.success("公告已保存");
      fetchAnnouncements();
    } catch {
      toast.error("保存失败，请稍后再试");
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/admin/announcements/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "上传失败");
        return;
      }

      setImageUrl(data.imageUrl);
      toast.success("图片已上传");
    } catch {
      toast.error("上传失败，请稍后再试");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleClearHistory() {
    const confirmed = window.confirm("确定要清空公告历史记录吗？当前公告会保留。");
    if (!confirmed) return;

    setClearingHistory(true);
    try {
      const res = await fetch("/api/admin/announcements/history", {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "清空失败");
        return;
      }

      toast.success(`已清空 ${data.deletedCount} 条历史记录`);
      fetchAnnouncements();
    } catch {
      toast.error("清空失败，请稍后再试");
    } finally {
      setClearingHistory(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">公告管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          编辑当前公告，每次保存都会生成一条历史记录。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>当前公告内容</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">加载中...</div>
          ) : (
            <>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={5000}
                rows={8}
                className="min-h-48"
                placeholder="输入要展示给用户的公告内容..."
              />
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex h-8 cursor-pointer items-center rounded-lg border px-3 text-sm font-medium hover:bg-accent">
                    {uploadingImage ? "上传中..." : "上传公告图片"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={uploadingImage}
                      onChange={(event) => {
                        void handleImageUpload(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {imageUrl && (
                    <Button variant="ghost" size="sm" onClick={() => setImageUrl(null)}>
                      移除图片
                    </Button>
                  )}
                </div>
                {imageUrl && (
                  <div className="w-fit rounded-lg border bg-muted/30 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="公告图片预览"
                      className="max-h-48 max-w-48 rounded-md object-contain"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {content.length}/5000
                  {announcement
                    ? ` · 最后更新于 ${new Date(announcement.updatedAt).toLocaleString("zh-CN")}`
                    : ""}
                </p>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "保存中..." : "保存公告"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="grid grid-cols-[1fr_auto] items-center gap-3">
          <CardTitle>历史记录</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearHistory}
            disabled={loading || clearingHistory || announcements.every((item) => item.isActive)}
          >
            {clearingHistory ? "清空中..." : "清空历史记录"}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">加载中...</div>
          ) : announcements.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">暂无公告历史</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>内容</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建人</TableHead>
                  <TableHead>创建时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-xl">
                      <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm">
                        {item.content}
                      </p>
                      {item.imageUrl && (
                        <p className="mt-1 text-xs text-muted-foreground">包含图片</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.isActive ? (
                        <Badge>当前</Badge>
                      ) : (
                        <Badge variant="secondary">历史</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.createdBy.name || item.createdBy.email}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(item.createdAt).toLocaleString("zh-CN")}
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
