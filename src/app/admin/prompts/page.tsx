"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type PromptItem = {
  id: string;
  imageUrl: string;
  imageUrls?: string[];
  model?: string;
  prompt: string;
  createdAt: string;
};

export default function AdminPromptsPage() {
  const [items, setItems] = useState<PromptItem[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchItems = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/prompts")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.prompts || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error("提示词列表加载失败");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function resetForm() {
    setImageUrls([]);
    setPrompt("");
    setEditingId(null);
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 10 - imageUrls.length;
    if (remainingSlots <= 0) {
      toast.error("最多上传 10 张图片");
      return;
    }

    const selectedFiles = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast.error("最多上传 10 张图片");
    }

    setUploading(true);

    const uploadedUrls: string[] = [];
    for (const file of selectedFiles) {
      if (!file.type.startsWith("image/")) {
        toast.error("请选择图片文件");
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("图片大小不能超过 10MB");
        continue;
      }

      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/admin/prompts/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "图片上传失败");
        continue;
      }

      uploadedUrls.push(data.imageUrl);
    }

    setUploading(false);
    event.target.value = "";

    if (uploadedUrls.length > 0) {
      setImageUrls((currentUrls) => [...currentUrls, ...uploadedUrls].slice(0, 10));
      toast.success(`${uploadedUrls.length} 张图片已压缩上传`);
    }
  }

  async function handleSave() {
    if (imageUrls.length === 0 || !prompt.trim()) {
      toast.error("请上传图片并填写提示词");
      return;
    }
    if (uploading) {
      toast.error("图片还在上传中");
      return;
    }

    setSaving(true);
    const res = await fetch(
      editingId ? `/api/admin/prompts/${editingId}` : "/api/admin/prompts",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: imageUrls[0], imageUrls, model: "gpt-image-2", prompt }),
      }
    );
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      toast.error(data.error || "保存失败");
      return;
    }

    toast.success(editingId ? "提示词已更新" : "提示词已新增");
    resetForm();
    fetchItems();
  }

  function handleEdit(item: PromptItem) {
    setEditingId(item.id);
    setImageUrls(item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls : [item.imageUrl]);
    setPrompt(item.prompt);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function removeImageUrl(imageUrl: string) {
    setImageUrls((currentUrls) => currentUrls.filter((url) => url !== imageUrl));
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/prompts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("删除失败");
      return;
    }

    toast.success("已删除");
    fetchItems();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">提示词管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          上传图片及其对应提示词，用户端会同步展示。
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-4 md:grid-cols-[240px_1fr]">
            <div className="space-y-2">
              <Label htmlFor="prompt-image">上传图片</Label>
              <Input
                id="prompt-image"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                {uploading
                  ? "正在压缩上传..."
                  : `上传后会自动压缩为清晰 WebP 图片，最多 10 张（已上传 ${imageUrls.length} 张）`}
              </p>
              {imageUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {imageUrls.map((imageUrl, index) => (
                    <div
                      key={imageUrl}
                      className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- Runtime upload files must bypass the image optimizer. */}
                      <img
                        src={imageUrl}
                        alt={`上传图片预览 ${index + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute right-1 top-1 h-7 px-2 opacity-0 transition group-hover:opacity-100"
                        onClick={() => removeImageUrl(imageUrl)}
                      >
                        移除
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt-text">提示词</Label>
              <Textarea
                id="prompt-text"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="输入这张图片对应的提示词"
                className="min-h-48"
              />
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving || uploading}>
                  {saving ? "保存中..." : uploading ? "上传中..." : "保存"}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={resetForm}>
                    取消编辑
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">加载中...</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">暂无提示词</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="grid gap-4 p-4 sm:grid-cols-[140px_1fr]">
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Runtime upload files must bypass the image optimizer. */}
                  <img
                    src={item.imageUrl}
                    alt="提示词图片"
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  {item.imageUrls && item.imageUrls.length > 1 && (
                    <div className="absolute bottom-1 right-1 rounded bg-background/85 px-1.5 py-0.5 text-xs">
                      {item.imageUrls.length} 张
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-3">
                  <p className="line-clamp-5 whitespace-pre-wrap text-sm leading-6">
                    {item.prompt}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(item)}
                    >
                      编辑
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
