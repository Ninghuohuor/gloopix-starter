"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ASPECT_RATIO_IDS } from "@/lib/validations";

type PromptItem = {
  id: string;
  imageUrl: string;
  imageUrls?: string[];
  model?: string;
  prompt: string;
  createdAt: string;
};

type PreviewImage = {
  imageUrl: string;
  prompt: string;
};

type PromptImageLoadState = Record<string, boolean>;

const PROMPT_MODEL_FILTERS = [
  { id: "gpt-image-2", label: "GPT-Image-2" },
] as const;

const PROMPT_IMAGE_ASPECT_RATIOS = ASPECT_RATIO_IDS.filter((id) => id !== "auto").map((id) => {
  const [width, height] = id.split(":").map(Number);
  return { id, value: width / height };
});

function choosePromptImageAspectRatio(width?: number, height?: number) {
  if (!width || !height) return null;
  const imageRatio = width / height;
  return PROMPT_IMAGE_ASPECT_RATIOS.reduce((best, current) => {
    const currentDistance = Math.abs(Math.log(imageRatio / current.value));
    const bestDistance = Math.abs(Math.log(imageRatio / best.value));
    return currentDistance < bestDistance ? current : best;
  }).id;
}

function getPromptColumnCount() {
  if (window.matchMedia("(min-width: 1024px)").matches) return 3;
  if (window.matchMedia("(min-width: 640px)").matches) return 2;
  return 1;
}

function splitPromptItemsIntoColumns<T>(items: T[], columnCount: number) {
  return Array.from({ length: columnCount }, (_, columnIndex) =>
    items.filter((_, itemIndex) => itemIndex % columnCount === columnIndex)
  );
}

export default function PromptsPage() {
  const router = useRouter();
  const [items, setItems] = useState<PromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModelFilter, setSelectedModelFilter] = useState("gpt-image-2");
  const [columnCount, setColumnCount] = useState(1);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<PreviewImage | null>(null);
  const [activeImageIndexes, setActiveImageIndexes] = useState<Record<string, number>>({});
  const [loadedPromptImageUrls, setLoadedPromptImageUrls] = useState<PromptImageLoadState>({});
  const [expandedPromptIds, setExpandedPromptIds] = useState<Set<string>>(() => new Set());
  const [overflowingPromptIds, setOverflowingPromptIds] = useState<Set<string>>(() => new Set());
  const promptTextRefs = useRef<Map<string, HTMLParagraphElement>>(new Map());
  const imageSizeRefs = useRef<Map<string, { width: number; height: number }>>(new Map());

  useEffect(() => {
    fetch("/api/prompts")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.prompts || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error("提示词加载失败");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    function updateColumnCount() {
      setColumnCount(getPromptColumnCount());
    }

    updateColumnCount();
    window.addEventListener("resize", updateColumnCount);
    return () => window.removeEventListener("resize", updateColumnCount);
  }, []);

  async function handleCopy(prompt: string) {
    await navigator.clipboard.writeText(prompt);
    toast.success("提示词已复制");
  }

  async function handleCopyAndGenerate(item: PromptItem, imageUrl: string) {
    try {
      await navigator.clipboard.writeText(item.prompt);
      toast.success("提示词已复制");
    } catch {
      toast.error("复制失败，已为你填入生成页");
    }

    const imageSize = imageSizeRefs.current.get(imageUrl);
    const aspectRatio = choosePromptImageAspectRatio(imageSize?.width, imageSize?.height);
    const params = new URLSearchParams({ prompt: item.prompt });
    if (aspectRatio) params.set("aspectRatio", aspectRatio);
    router.push(`/?${params.toString()}`);
  }

  const measurePromptOverflow = useCallback(() => {
    const nextOverflowingIds = new Set<string>();

    promptTextRefs.current.forEach((node, id) => {
      const lineHeight = Number.parseFloat(window.getComputedStyle(node).lineHeight) || 24;
      if (node.scrollHeight > lineHeight * 9 + 1) {
        nextOverflowingIds.add(id);
      }
    });

    setOverflowingPromptIds(nextOverflowingIds);
  }, []);

  useEffect(() => {
    measurePromptOverflow();
    window.addEventListener("resize", measurePromptOverflow);
    return () => window.removeEventListener("resize", measurePromptOverflow);
  }, [items, measurePromptOverflow]);

  function togglePromptExpanded(id: string) {
    setExpandedPromptIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(id)) {
        nextIds.delete(id);
      } else {
        nextIds.add(id);
      }
      return nextIds;
    });
  }

  function getItemImageUrls(item: PromptItem) {
    return item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls : [item.imageUrl];
  }

  function getActiveImageUrl(item: PromptItem) {
    const imageUrls = getItemImageUrls(item);
    const activeIndex = Math.min(activeImageIndexes[item.id] || 0, imageUrls.length - 1);
    return imageUrls[activeIndex] || item.imageUrl;
  }

  function setActiveImageIndex(itemId: string, index: number) {
    setActiveImageIndexes((currentIndexes) => ({
      ...currentIndexes,
      [itemId]: index,
    }));
  }

  function markPromptImageLoaded(imageUrl: string) {
    setLoadedPromptImageUrls((currentState) => ({
      ...currentState,
      [imageUrl]: true,
    }));
  }

  const visibleItems = items.filter(
    (item) => (item.model || "gpt-image-2") === selectedModelFilter
  );
  const promptColumns = splitPromptItemsIntoColumns(visibleItems, columnCount);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">提示词库</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          查看图片案例和对应提示词。
        </p>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="提示词模型筛选">
          {PROMPT_MODEL_FILTERS.map((filter) => (
            <Button
              key={filter.id}
              type="button"
              variant={selectedModelFilter === filter.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedModelFilter(filter.id)}
              className="min-h-10"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">加载中...</div>
      ) : visibleItems.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">暂无提示词</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promptColumns.map((columnItems, columnIndex) => (
            <div key={`prompt-column-${columnIndex}`} className="space-y-4">
              {columnItems.map((item) => {
                const imageUrls = getItemImageUrls(item);
                const activeImageUrl = getActiveImageUrl(item);

                return (
                  <Card key={item.id} className="overflow-hidden py-0">
                    <button
                      type="button"
                      onClick={() => setSelectedPreviewImage({ imageUrl: activeImageUrl, prompt: item.prompt })}
                      className="group relative block min-h-48 w-full overflow-hidden bg-muted text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="预览提示词示例图片"
                    >
                      {!loadedPromptImageUrls[activeImageUrl] && (
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 flex items-center justify-center bg-muted text-xs text-muted-foreground"
                        >
                          图片加载中
                        </div>
                      )}
                      <img
                        src={activeImageUrl}
                        alt="提示词示例图片"
                        loading="lazy"
                        decoding="async"
                        onLoad={(event) => {
                          imageSizeRefs.current.set(activeImageUrl, {
                            width: event.currentTarget.naturalWidth,
                            height: event.currentTarget.naturalHeight,
                          });
                          markPromptImageLoaded(activeImageUrl);
                        }}
                        className={`h-auto w-full transition duration-200 group-hover:scale-[1.02] ${
                          loadedPromptImageUrls[activeImageUrl] ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </button>
                    {imageUrls.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto px-4 pt-3" aria-label="切换提示词参考图">
                        {imageUrls.map((imageUrl, index) => (
                          <button
                            key={`${item.id}-${imageUrl}`}
                            type="button"
                            onClick={() => setActiveImageIndex(item.id, index)}
                            className={`h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted outline-none transition hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring ${
                              activeImageUrl === imageUrl ? "border-primary" : "border-border"
                            }`}
                            aria-label={`查看第 ${index + 1} 张参考图`}
                          >
                            <img
                              src={imageUrl}
                              alt={`提示词参考图 ${index + 1}`}
                              loading="lazy"
                              decoding="async"
                              onLoad={(event) => {
                                imageSizeRefs.current.set(imageUrl, {
                                  width: event.currentTarget.naturalWidth,
                                  height: event.currentTarget.naturalHeight,
                                });
                                markPromptImageLoaded(imageUrl);
                              }}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                    <CardContent className="space-y-3 p-4">
                      <p
                        ref={(node) => {
                          if (node) {
                            promptTextRefs.current.set(item.id, node);
                          } else {
                            promptTextRefs.current.delete(item.id);
                          }
                        }}
                        className={`whitespace-pre-wrap text-sm leading-6 ${
                          expandedPromptIds.has(item.id) ? "" : "line-clamp-9"
                        }`}
                      >
                        {item.prompt}
                      </p>
                      {overflowingPromptIds.has(item.id) && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs text-muted-foreground"
                          aria-expanded={expandedPromptIds.has(item.id)}
                          onClick={() => togglePromptExpanded(item.id)}
                        >
                          {expandedPromptIds.has(item.id) ? "收起" : "展开"}
                        </Button>
                      )}
                      <div className="grid gap-2 min-[380px]:grid-cols-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(item.prompt)}
                          className="min-h-10"
                        >
                          复制提示词
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleCopyAndGenerate(item, activeImageUrl)}
                          className="min-h-10"
                        >
                          复制并立即生成
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={!!selectedPreviewImage}
        onOpenChange={(open) => {
          if (!open) setSelectedPreviewImage(null);
        }}
      >
        {selectedPreviewImage && (
          <DialogContent className="max-w-[min(94vw,1100px)] gap-3 p-3 sm:max-w-[min(94vw,1100px)]">
            <DialogTitle className="sr-only">预览提示词示例图片</DialogTitle>
            <DialogDescription className="sr-only">
              {selectedPreviewImage.prompt}
            </DialogDescription>
            <div className="flex h-[min(78vh,900px)] w-full items-center justify-center rounded-lg bg-muted">
              <img
                src={selectedPreviewImage.imageUrl}
                alt="提示词示例图片"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
