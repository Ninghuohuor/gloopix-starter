"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { shouldBypassImageOptimizer } from "@/lib/image-url";
import { GenerationMetadataLine } from "@/components/generation/generation-metadata-line";
import type { ImageQuality, ImageResolution } from "@/lib/image-models";

interface ImageRecord {
  id: string;
  prompt: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  status: string;
  model: string;
  aspectRatio: string;
  quality: ImageQuality;
  resolution: ImageResolution;
  createdAt: string;
}

function groupImagesByDate(images: ImageRecord[]) {
  return images.reduce<Array<{ dateLabel: string; images: ImageRecord[] }>>((groups, image) => {
    const dateLabel = new Date(image.createdAt).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const existingGroup = groups.find((group) => group.dateLabel === dateLabel);
    if (existingGroup) {
      existingGroup.images.push(image);
    } else {
      groups.push({ dateLabel, images: [image] });
    }
    return groups;
  }, []);
}

export default function HistoryPage() {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<ImageRecord | null>(null);

  function loadHistory() {
    setLoading(true);
    const searchSuffix = activeSearchQuery
      ? `&query=${encodeURIComponent(activeSearchQuery)}`
      : "";
    fetch(`/api/user/history?all=1${searchSuffix}`)
      .then((r) => r.json())
      .then((d) => {
        setImages(d.images);
        setLoading(false);
      })
      .catch(() => {
        toast.error("历史记录加载失败");
        setLoading(false);
      });
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSearchQuery]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveSearchQuery(searchInput.trim());
  }

  function handleResetSearch() {
    setSearchInput("");
    setActiveSearchQuery("");
  }

  async function handleDelete(id: string) {
    if (!window.confirm("确认删除这张图片？删除后无法恢复。")) return;

    setDeletingIds((current) => new Set(current).add(id));
    const res = await fetch(`/api/user/history?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    setDeletingIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "删除失败");
      return;
    }

    toast.success("已删除");
    loadHistory();
  }

  async function handleCopyPrompt(prompt: string) {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("提示词已复制");
    } catch {
      toast.error("复制失败");
    }
  }

  const groupedImages = groupImagesByDate(images);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">生成历史</h1>
          <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            生成图保存30天
          </span>
        </div>
        <form
          onSubmit={handleSearch}
          className="flex w-[min(100%,28rem)] shrink-0 gap-2 max-[420px]:flex-wrap"
          aria-label="搜索生成历史"
        >
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="搜索提示词"
            className="h-10 min-w-0 flex-1 max-[420px]:w-full max-[420px]:flex-none"
          />
          <Button type="submit" variant="outline" className="h-10 max-[420px]:flex-1">
            搜索
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleResetSearch}
            className="h-10 max-[420px]:flex-1"
          >
            重置
          </Button>
        </form>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-square bg-muted animate-pulse" />
              <CardContent className="p-3">
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {activeSearchQuery ? (
            <p>没有找到相关图片</p>
          ) : (
            <>
              <p>还没有生成过图片</p>
              <a href="/generate" className="text-primary underline mt-2 inline-block">
                去生成一张
              </a>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-8">
            {groupedImages.map((group) => (
              <section key={group.dateLabel} className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {group.dateLabel}
                </h2>
                <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {group.images.map((img) => (
                    <Card key={img.id} className="overflow-hidden">
                      <div className="relative aspect-square">
                        <button
                          type="button"
                          onClick={() => setSelectedPreviewImage(img)}
                          className="group relative h-full w-full bg-muted text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Image
                            src={img.thumbnailUrl || img.imageUrl || "/placeholder.png"}
                            alt={img.prompt}
                            fill
                            className="object-cover transition group-hover:scale-[1.02]"
                            loading="lazy"
                            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                            unoptimized={shouldBypassImageOptimizer(img.thumbnailUrl || img.imageUrl)}
                          />
                        </button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-sm"
                          disabled={deletingIds.has(img.id)}
                          onClick={() => handleDelete(img.id)}
                          className="absolute right-2 top-2 h-10 w-10 bg-background/90 text-destructive shadow-sm hover:bg-destructive/20 sm:h-7 sm:w-7"
                          aria-label="删除图片"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardContent className="space-y-2 p-3">
                        <div className="flex items-start gap-2">
                          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                            {img.prompt}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleCopyPrompt(img.prompt)}
                            aria-label="复制提示词"
                            className="-mr-1 -mt-1 h-10 w-10 shrink-0 sm:h-7 sm:w-7"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(img.createdAt).toLocaleString("zh-CN")}
                        </p>
                        <GenerationMetadataLine
                          model={img.model}
                          aspectRatio={img.aspectRatio}
                          resolution={img.resolution}
                          quality={img.quality}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <Dialog
        open={!!selectedPreviewImage}
        onOpenChange={(open) => {
          if (!open) setSelectedPreviewImage(null);
        }}
      >
        {selectedPreviewImage && (
          <DialogContent className="max-w-[min(94vw,1100px)] gap-3 p-3 sm:max-w-[min(94vw,1100px)]">
            <DialogTitle className="sr-only">预览图片</DialogTitle>
            <DialogDescription className="sr-only">
              {selectedPreviewImage.prompt}
            </DialogDescription>
            <div className="relative h-[min(78vh,900px)] w-full overflow-hidden rounded-lg bg-muted">
              <Image
                src={selectedPreviewImage.imageUrl || "/placeholder.png"}
                alt={selectedPreviewImage.prompt}
                fill
                className="object-contain"
                sizes="94vw"
                priority
                unoptimized={shouldBypassImageOptimizer(selectedPreviewImage.imageUrl)}
              />
            </div>
            <DialogFooter className="-mx-3 -mb-3 px-3">
              <div className="mr-auto self-center">
                <GenerationMetadataLine
                  model={selectedPreviewImage.model}
                  aspectRatio={selectedPreviewImage.aspectRatio}
                  resolution={selectedPreviewImage.resolution}
                  quality={selectedPreviewImage.quality}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCopyPrompt(selectedPreviewImage.prompt)}
              >
                复制提示词
              </Button>
              <a
                href={`/api/image-download?url=${encodeURIComponent(selectedPreviewImage.imageUrl)}`}
                className={buttonVariants()}
              >
                下载图片
              </a>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
