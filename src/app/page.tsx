"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Image from "next/image";
import { Copy, X } from "lucide-react";
import { ChatComposer } from "@/components/generation/chat-composer";
import { GenerationMetadataLine } from "@/components/generation/generation-metadata-line";
import {
  type ChatMessage,
  type ReferenceImageItem,
  useGenerationSession,
} from "@/components/generation/generation-session-provider";
import { formatElapsedTime } from "@/lib/time";
import { resolveAspectRatio } from "@/lib/aspect-ratio";
import { shouldBypassImageOptimizer } from "@/lib/image-url";
import {
  getAvailableAspectRatiosForModel,
  getDefaultAspectRatioForModel,
  getImageModelConfig,
  isAspectRatioCompatibleWithModel,
  isAspectRatioCompatibleWithResolution,
  type ImageModelConfig,
} from "@/lib/image-models";
import { ASPECT_RATIO_IDS, AVAILABLE_QUALITIES } from "@/lib/validations";

interface PreviewImage {
  prompt: string;
  imageUrl: string;
  imageUrls: string[];
  thumbnailUrls: string[];
  activeIndex: number;
}

function ImageGenerationLoader({ elapsed }: { elapsed: number }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      <div
        className="gpt-image-loader-card"
        role="status"
        aria-label={`正在生成图片，已用时 ${formatElapsedTime(elapsed)}`}
      >
        <div className="gpt-image-loader-dots" />
      </div>
      <span>正在生成 · {formatElapsedTime(elapsed)}</span>
    </div>
  );
}

function getImageFrameStyle(message: ChatMessage): CSSProperties {
  const ratio = resolveAspectRatio(message.prompt, message.aspectRatio);
  return { aspectRatio: ratio ? `${ratio.width} / ${ratio.height}` : "1 / 1" };
}

const FOUR_K_UNSUPPORTED_MESSAGE =
  "当前尺寸不支持 4K，请改用 16:9、9:16、2:1、1:2、21:9 或 9:21 尺寸。";
const MODEL_UNSUPPORTED_ASPECT_RATIO_MESSAGE = "当前模型不支持所选图片尺寸，已切换为支持的尺寸。";

function getRegenerateParameterSummary(message: ChatMessage, imageModels: ImageModelConfig[]) {
  const modelConfig = getImageModelConfig(message.model, imageModels);
  const modelName = imageModels.find((option) => option.id === message.model)?.name || message.model;
  const aspectRatioName =
    getAvailableAspectRatiosForModel(message.model, imageModels).find((option) => option.id === message.aspectRatio)
      ?.name || message.aspectRatio;
  const qualityName =
    AVAILABLE_QUALITIES.find((option) => option.id === message.quality)?.name || message.quality;
  const parts = [
    modelName,
    aspectRatioName,
    modelConfig.supportsQuality ? qualityName : null,
    modelConfig.supportsResolution ? message.resolution.toUpperCase() : null,
    `${message.quantity}张`,
  ].filter(Boolean);

  return `复用 ${parts.join(" · ")}`;
}

function GeneratedResultImagePicker({
  message,
  activeImageUrl,
  onPreview,
  onSelectImage,
}: {
  message: ChatMessage;
  activeImageUrl: string;
  onPreview: (imageUrl: string, index: number) => void;
  onSelectImage: (index: number) => void;
}) {
  const imageUrls = message.imageUrls || [];
  const thumbnailUrls = message.thumbnailUrls || [];
  const activeIndex = Math.max(0, imageUrls.indexOf(activeImageUrl));
  const activeThumbnailUrl = thumbnailUrls[activeIndex] || activeImageUrl;

  return (
    <div className="flex max-w-full items-start gap-3 max-[420px]:flex-col">
      <button
        type="button"
        onClick={() => onPreview(activeImageUrl, Math.max(0, imageUrls.indexOf(activeImageUrl)))}
        className="group relative w-[min(18rem,78vw)] shrink-0 overflow-hidden rounded-lg border bg-muted text-left outline-none transition hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring max-[420px]:w-full"
        style={getImageFrameStyle(message)}
      >
        <Image
          src={activeThumbnailUrl}
          alt={message.prompt}
          fill
          className="object-contain transition group-hover:scale-[1.01]"
          unoptimized={shouldBypassImageOptimizer(activeThumbnailUrl)}
        />
      </button>
      {imageUrls.length > 1 && (
        <div className="flex max-h-[min(18rem,78vw)] flex-col gap-2 overflow-y-auto pr-1 max-[420px]:max-h-none max-[420px]:w-full max-[420px]:max-w-full max-[420px]:flex-row max-[420px]:overflow-x-auto max-[420px]:overflow-y-hidden max-[420px]:pb-1 max-[420px]:pr-0" aria-label="切换生成结果图片">
          {imageUrls.map((imageUrl, index) => {
            const thumbnailUrl = thumbnailUrls[index] || imageUrl;
            return (
            <button
              key={imageUrl}
              type="button"
              onClick={() => onSelectImage(index)}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted outline-none transition hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring ${
                activeImageUrl === imageUrl ? "border-primary" : "border-border"
              }`}
              aria-label={`查看第 ${index + 1} 张生成图`}
            >
              <Image
                src={thumbnailUrl}
                alt={`${message.prompt} ${index + 1}`}
                fill
                className="object-cover"
                sizes="56px"
                unoptimized={shouldBypassImageOptimizer(thumbnailUrl)}
              />
            </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const {
    authStatus: status,
    prompt,
    setPrompt,
    model,
    setModel,
    aspectRatio,
    setAspectRatio,
    quality,
    setQuality,
    resolution,
    setResolution,
    quantity,
    setQuantity,
    loading,
    messages,
    referenceImages,
    elapsed,
    handleFileSelect,
    handleFilesSelect,
    removeReferenceImage,
    runGeneration,
    imageModels,
    apiConfigured,
    branding,
    features,
  } = useGenerationSession();
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<PreviewImage | null>(null);
  const [selectedReferencePreviewImage, setSelectedReferencePreviewImage] =
    useState<ReferenceImageItem | null>(null);
  const [activeResultImageIndexes, setActiveResultImageIndexes] = useState<Record<string, number>>({});
  const resultRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prefillAppliedRef = useRef(false);
  const shouldAutoScrollResultsRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const isPromptComposingRef = useRef(false);
  const ignoreNextPromptEnterRef = useRef(false);

  const setPreviewImageIndex = useCallback((index: number) => {
    setSelectedPreviewImage((currentPreview) => {
      if (!currentPreview || currentPreview.imageUrls.length === 0) return currentPreview;
      const nextIndex =
        (index + currentPreview.imageUrls.length) % currentPreview.imageUrls.length;

      return {
        ...currentPreview,
        activeIndex: nextIndex,
        imageUrl: currentPreview.imageUrls[nextIndex],
      };
    });
  }, []);

  const movePreviewImage = useCallback((direction: -1 | 1) => {
    setSelectedPreviewImage((currentPreview) => {
      if (!currentPreview || currentPreview.imageUrls.length <= 1) return currentPreview;
      const nextIndex =
        (currentPreview.activeIndex + direction + currentPreview.imageUrls.length) %
        currentPreview.imageUrls.length;

      return {
        ...currentPreview,
        activeIndex: nextIndex,
        imageUrl: currentPreview.imageUrls[nextIndex],
      };
    });
  }, []);

  useEffect(() => {
    const resultEl = resultRef.current;
    if (!resultEl) {
      previousMessageCountRef.current = messages.length;
      return;
    }

    const hasNewMessage = messages.length > previousMessageCountRef.current;
    previousMessageCountRef.current = messages.length;

    if (!hasNewMessage && !shouldAutoScrollResultsRef.current) return;

    requestAnimationFrame(() => {
      resultEl.scrollTop = resultEl.scrollHeight;
    });
  }, [messages]);

  useEffect(() => {
    if (prefillAppliedRef.current) return;
    prefillAppliedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const prefillPrompt = params.get("prompt");
    const prefillAspectRatio = params.get("aspectRatio");

    if (prefillPrompt) {
      setPrompt(prefillPrompt);
    }

    if (
      prefillAspectRatio &&
      ASPECT_RATIO_IDS.includes(prefillAspectRatio as (typeof ASPECT_RATIO_IDS)[number])
    ) {
      setAspectRatio(prefillAspectRatio);
    }
  }, [setAspectRatio, setPrompt]);

  useEffect(() => {
    if (isAspectRatioCompatibleWithModel(model, aspectRatio, imageModels)) return;
    const fallbackAspectRatio = getDefaultAspectRatioForModel(model, resolution, imageModels);
    setAspectRatio(fallbackAspectRatio);
    toast.info(MODEL_UNSUPPORTED_ASPECT_RATIO_MESSAGE);
  }, [aspectRatio, imageModels, model, resolution, setAspectRatio]);

  useEffect(() => {
    if (!selectedPreviewImage) return;

    function handlePreviewKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedPreviewImage(null);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        movePreviewImage(-1);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        movePreviewImage(1);
      }
    }

    window.addEventListener("keydown", handlePreviewKeyDown);
    return () => window.removeEventListener("keydown", handlePreviewKeyDown);
  }, [movePreviewImage, selectedPreviewImage]);

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleFileSelect(file);
        return;
      }
    }
  }

  async function copyPromptToClipboard(promptText: string) {
    try {
      await navigator.clipboard.writeText(promptText);
      toast.success("已复制提示词");
    } catch {
      toast.error("复制失败");
    }
  }

  async function handleGenerate() {
    const promptText = prompt.trim();
    if (!promptText) {
      toast.info("请输入提示词后再生成");
      return;
    }

    if (!isAspectRatioCompatibleWithModel(model, aspectRatio, imageModels)) {
      const fallbackAspectRatio = getDefaultAspectRatioForModel(model, resolution, imageModels);
      setAspectRatio(fallbackAspectRatio);
      toast.error(MODEL_UNSUPPORTED_ASPECT_RATIO_MESSAGE);
      return;
    }

    if (!isAspectRatioCompatibleWithResolution(aspectRatio, resolution)) {
      toast.error(FOUR_K_UNSUPPORTED_MESSAGE);
      return;
    }

    shouldAutoScrollResultsRef.current = true;

    await runGeneration({
      promptText,
      selectedModel: model,
      selectedAspectRatio: aspectRatio,
      selectedQuality: quality,
      selectedResolution: resolution,
      selectedQuantity: quantity,
      selectedReferenceImages: referenceImages,
      clearComposer: true,
    });
  }

  async function handleRegenerate(message: ChatMessage) {
    if (!isAspectRatioCompatibleWithModel(message.model, message.aspectRatio)) {
      toast.error("当前模型不支持该历史记录的图片尺寸，请重新选择尺寸后生成。");
      return;
    }

    if (!isAspectRatioCompatibleWithResolution(message.aspectRatio, message.resolution)) {
      toast.error(FOUR_K_UNSUPPORTED_MESSAGE);
      return;
    }

    shouldAutoScrollResultsRef.current = true;

    await runGeneration({
      promptText: message.prompt,
      selectedModel: message.model,
      selectedAspectRatio: message.aspectRatio,
      selectedQuality: message.quality,
      selectedResolution: message.resolution,
      selectedQuantity: message.quantity,
      selectedReferenceImages: message.referenceImages || [],
      clearComposer: false,
    });
  }

  function getActiveResultImageUrl(message: ChatMessage) {
    const imageUrls = message.imageUrls || [];
    const activeIndex = Math.min(activeResultImageIndexes[message.id] || 0, imageUrls.length - 1);
    return imageUrls[activeIndex] || imageUrls[0] || "";
  }

  function setActiveResultImageIndex(messageId: string, index: number) {
    setActiveResultImageIndexes((currentIndexes) => ({
      ...currentIndexes,
      [messageId]: index,
    }));
  }

  function openResultPreview(message: ChatMessage, imageUrl: string, index: number) {
    const imageUrls = message.imageUrls || [];
    const thumbnailUrls = message.thumbnailUrls || [];
    setSelectedPreviewImage({
      prompt: message.prompt,
      imageUrl,
      imageUrls,
      thumbnailUrls,
      activeIndex: index,
    });
  }

  function isNearResultsBottom(resultEl: HTMLDivElement) {
    return resultEl.scrollHeight - resultEl.scrollTop - resultEl.clientHeight <= 120;
  }

  function handleResultsScroll() {
    const resultEl = resultRef.current;
    if (!resultEl) return;

    shouldAutoScrollResultsRef.current = isNearResultsBottom(resultEl);
  }

  function handlePromptCompositionStart() {
    isPromptComposingRef.current = true;
    ignoreNextPromptEnterRef.current = false;
  }

  function handlePromptCompositionEnd() {
    isPromptComposingRef.current = false;
    ignoreNextPromptEnterRef.current = true;
    window.setTimeout(() => {
      ignoreNextPromptEnterRef.current = false;
    }, 50);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const nativeEvent = e.nativeEvent as KeyboardEvent & {
      isComposing?: boolean;
      keyCode?: number;
    };
    const keyCode = nativeEvent.keyCode;

    if (
      isPromptComposingRef.current ||
      ignoreNextPromptEnterRef.current ||
      nativeEvent.isComposing ||
      keyCode === 229
    ) {
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  }

  const hasConversation = messages.length > 0;

  function renderComposer() {
    return (
      <ChatComposer
        prompt={prompt}
        onPromptChange={setPrompt}
        onPromptKeyDown={handleKeyDown}
        onPromptCompositionStart={handlePromptCompositionStart}
        onPromptCompositionEnd={handlePromptCompositionEnd}
        onPromptPaste={handlePaste}
        model={model}
        onModelChange={setModel}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        quality={quality}
        onQualityChange={setQuality}
        resolution={resolution}
        onResolutionChange={setResolution}
        quantity={quantity}
        onQuantityChange={setQuantity}
        referenceImages={referenceImages}
        onRemoveReferenceImage={removeReferenceImage}
        fileInputRef={fileInputRef}
        onFilesSelect={handleFilesSelect}
        onSubmit={handleGenerate}
        loading={loading}
        imageModels={imageModels}
        apiConfigured={apiConfigured}
        creditsEnabled={features.creditsEnabled}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Result area */}
      <div ref={resultRef} onScroll={handleResultsScroll} className="min-h-0 flex-1 overflow-y-auto">
        {hasConversation ? (
          <div className="container mx-auto max-w-3xl space-y-6 px-4 py-6">
            {messages.map((img) => (
              <div key={img.id} className="space-y-3">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="group/message flex max-w-[min(100%,36rem)] items-start gap-2">
                    <button
                      type="button"
                      onClick={() => copyPromptToClipboard(img.prompt)}
                      className="mt-2 flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground opacity-100 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover/message:opacity-100"
                      aria-label="复制提示词"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <div className="max-w-md space-y-2 rounded-lg bg-primary/10 px-4 py-3">
                      <p className="text-sm">{img.prompt}</p>
                      {img.referenceImages && img.referenceImages.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {img.referenceImages.map((referenceImage) => (
                            <button
                              key={referenceImage.id}
                              type="button"
                              onClick={() => setSelectedReferencePreviewImage(referenceImage)}
                              className="reference-image-preview group relative h-16 w-16 overflow-hidden rounded border bg-muted outline-none transition hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label={`预览参考图 ${referenceImage.name}`}
                            >
                              <Image
                                src={referenceImage.dataUrl}
                                alt={referenceImage.name}
                                fill
                                className="object-cover transition group-hover:scale-[1.04]"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* AI response */}
                <div className="flex justify-start">
                  <div className="space-y-2">
                    {img.status === "generating" && <ImageGenerationLoader elapsed={elapsed} />}
                    {img.status === "failed" && (
                      <div
                        className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm"
                        role="alert"
                      >
                        <p className="font-medium text-destructive">生成失败</p>
                        <p className="mt-1 text-destructive">
                          失败原因：{img.error || "未返回明确失败原因，请稍后重试。"}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRegenerate(img)}
                          disabled={loading}
                          className="mt-2 text-primary underline disabled:pointer-events-none disabled:opacity-50"
                        >
                          一键重试
                        </button>
                      </div>
                    )}
                    {img.status === "completed" && img.imageUrls && (
                      <>
                        {img.durationSeconds && (
                          <div className="text-xs text-muted-foreground">
                            本次生成图片用时 {img.durationSeconds} 秒
                          </div>
                        )}
                        <GeneratedResultImagePicker
                          message={img}
                          activeImageUrl={getActiveResultImageUrl(img)}
                          onPreview={(imageUrl, index) => openResultPreview(img, imageUrl, index)}
                          onSelectImage={(index) => setActiveResultImageIndex(img.id, index)}
                        />
                        <div className="space-y-1">
                          <GenerationMetadataLine
                            model={img.model}
                            aspectRatio={img.aspectRatio}
                            resolution={img.resolution}
                            quality={img.quality}
                          />
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                            <a
                              href={`/api/image-download?url=${encodeURIComponent(getActiveResultImageUrl(img))}`}
                              download
                              className="text-primary underline"
                            >
                              下载图片
                            </a>
                            <button
                              type="button"
                              onClick={() => handleRegenerate(img)}
                              disabled={loading}
                              className="text-primary underline disabled:pointer-events-none disabled:opacity-50"
                            >
                              重新生成
                            </button>
                            <span className="text-xs text-muted-foreground">
                              {getRegenerateParameterSummary(img, imageModels)}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-5 px-4 pb-[8vh] pt-6">
            <h1 className="text-3xl font-bold">{branding.siteName}</h1>
            <p className="max-w-md text-center text-muted-foreground">
              {branding.siteDescription}
            </p>
            {status === "unauthenticated" && (
              <p className="text-sm text-muted-foreground">
                请先{" "}
                <a href="/login" className="text-primary underline">登录</a>
                {" "}或{" "}
                <a href="/register" className="text-primary underline">注册</a>
                {" "}后使用
              </p>
            )}
            {!apiConfigured && (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-200">
                图片 API 尚未配置，管理员可在“管理后台 → 站点设置”中完成配置。
              </p>
            )}
            <div className="w-full max-w-3xl">
              {renderComposer()}
            </div>
          </div>
        )}
      </div>

      {hasConversation && (
        <div className="z-20 shrink-0 bg-transparent md:static md:bg-transparent md:backdrop-blur-none">
          {renderComposer()}
        </div>
      )}

      <Dialog
        open={!!selectedPreviewImage}
        onOpenChange={(open) => {
          if (!open) setSelectedPreviewImage(null);
        }}
      >
        {selectedPreviewImage && (
          <DialogContent
            showCloseButton={false}
            className="max-w-[min(94vw,1100px)] gap-3 p-3 sm:max-w-[min(94vw,1100px)]"
          >
            <DialogTitle className="sr-only">预览图片</DialogTitle>
            <DialogDescription className="sr-only">
              {selectedPreviewImage.prompt}
            </DialogDescription>
            <button
              type="button"
              onClick={() => setSelectedPreviewImage(null)}
              className="fixed right-[calc(env(safe-area-inset-right)+0.75rem)] top-[calc(env(safe-area-inset-top)+0.75rem)] z-[60] flex size-11 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg backdrop-blur transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:absolute sm:right-4 sm:top-4 sm:size-9 sm:shadow"
              aria-label="关闭图片预览"
            >
              <X className="size-5 sm:size-4" />
            </button>
            <div className="relative h-[min(78vh,900px)] w-full overflow-hidden rounded-lg bg-muted">
              <Image
                src={selectedPreviewImage.imageUrl || ""}
                alt={selectedPreviewImage.prompt}
                fill
                className="object-contain"
                sizes="94vw"
                priority
                unoptimized={shouldBypassImageOptimizer(selectedPreviewImage.imageUrl || "")}
              />
              {selectedPreviewImage.imageUrls.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setPreviewImageIndex(selectedPreviewImage.activeIndex - 1)}
                    className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="上一张"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewImageIndex(selectedPreviewImage.activeIndex + 1)}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="下一张"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
            {selectedPreviewImage.imageUrls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1" aria-label="切换预览图片">
                {selectedPreviewImage.imageUrls.map((imageUrl, index) => (
                  <button
                    key={imageUrl}
                    type="button"
                    onClick={() => setPreviewImageIndex(index)}
                    className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted outline-none transition hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring ${
                      selectedPreviewImage.activeIndex === index ? "border-primary" : "border-border"
                    }`}
                    aria-label={`预览第 ${index + 1} 张生成图`}
                  >
                    <Image
                      src={imageUrl}
                      alt={`${selectedPreviewImage.prompt} ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="56px"
                      unoptimized={shouldBypassImageOptimizer(imageUrl)}
                    />
                  </button>
                ))}
              </div>
            )}
            <DialogFooter className="-mx-3 -mb-3 px-3">
              <button
                type="button"
                onClick={() => setSelectedPreviewImage(null)}
                className={buttonVariants({ variant: "outline" })}
              >
                关闭
              </button>
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

      <Dialog
        open={!!selectedReferencePreviewImage}
        onOpenChange={(open) => {
          if (!open) setSelectedReferencePreviewImage(null);
        }}
      >
        {selectedReferencePreviewImage && (
          <DialogContent className="max-w-[min(94vw,900px)] gap-3 p-3 sm:max-w-[min(94vw,900px)]">
            <DialogTitle className="sr-only">预览参考图</DialogTitle>
            <DialogDescription className="sr-only">
              {selectedReferencePreviewImage.name}
            </DialogDescription>
            <div className="relative h-[min(78vh,760px)] w-full overflow-hidden rounded-lg bg-muted">
              <Image
                src={selectedReferencePreviewImage.dataUrl}
                alt={selectedReferencePreviewImage.name}
                fill
                className="h-full w-full object-contain"
              />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
