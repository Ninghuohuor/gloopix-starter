"use client";

/* eslint-disable @next/next/no-img-element */
import { type RefObject, useState } from "react";
import type { ClipboardEvent, CompositionEvent, DragEvent, KeyboardEvent } from "react";
import { ArrowUp, FileImage, Paperclip, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  AVAILABLE_ASPECT_RATIOS,
  AVAILABLE_QUALITIES,
  AVAILABLE_RESOLUTIONS,
} from "@/lib/validations";
import {
  calculateImageCreditCost,
  getAvailableAspectRatiosForModel,
  getImageModelConfig,
  type ImageQuality,
  type ImageModelConfig,
  type ImageResolution,
} from "@/lib/image-models";
import type { ReferenceImageItem } from "@/components/generation/generation-session-provider";

type ChatComposerProps = {
  prompt: string;
  onPromptChange: (value: string) => void;
  onPromptKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onPromptCompositionStart: (event: CompositionEvent<HTMLTextAreaElement>) => void;
  onPromptCompositionEnd: (event: CompositionEvent<HTMLTextAreaElement>) => void;
  onPromptPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  model: string;
  onModelChange: (value: string) => void;
  aspectRatio: string;
  onAspectRatioChange: (value: string) => void;
  quality: ImageQuality;
  onQualityChange: (value: ImageQuality) => void;
  resolution: ImageResolution;
  onResolutionChange: (value: ImageResolution) => void;
  quantity: number;
  onQuantityChange: (value: number) => void;
  referenceImages: ReferenceImageItem[];
  onRemoveReferenceImage: (id: string) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFilesSelect: (files: File[]) => void;
  onSubmit: () => void;
  loading: boolean;
  imageModels: ImageModelConfig[];
  apiConfigured: boolean;
  creditsEnabled: boolean;
};

export function ChatComposer({
  prompt,
  onPromptChange,
  onPromptKeyDown,
  onPromptCompositionStart,
  onPromptCompositionEnd,
  onPromptPaste,
  model,
  onModelChange,
  aspectRatio,
  onAspectRatioChange,
  quality,
  onQualityChange,
  resolution,
  onResolutionChange,
  quantity,
  onQuantityChange,
  referenceImages,
  onRemoveReferenceImage,
  fileInputRef,
  onFilesSelect,
  onSubmit,
  loading,
  imageModels,
  apiConfigured,
  creditsEnabled,
}: ChatComposerProps) {
  const modelConfig = getImageModelConfig(model, imageModels);
  const availableAspectRatios = getAvailableAspectRatiosForModel(model, imageModels);
  const aspectRatioOptions =
    availableAspectRatios.length > 0 ? availableAspectRatios : AVAILABLE_ASPECT_RATIOS;
  const resolutionOptions = modelConfig.supportedResolutions?.length
    ? AVAILABLE_RESOLUTIONS.filter((option) => modelConfig.supportedResolutions?.includes(option.id))
    : AVAILABLE_RESOLUTIONS;
  const creditCost = calculateImageCreditCost({ model, quality, resolution, quantity, models: imageModels });
  const canSubmit = prompt.trim().length > 0 && !loading && apiConfigured;
  const [previewReferenceImage, setPreviewReferenceImage] = useState<ReferenceImageItem | null>(null);
  const [isDraggingReferenceImage, setIsDraggingReferenceImage] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  const selectedModelName =
    imageModels.find((option) => option.id === model)?.name || model;
  const selectedAspectRatioName =
    aspectRatioOptions.find((option) => option.id === aspectRatio)?.name || aspectRatio;
  const selectedQualityName =
    AVAILABLE_QUALITIES.find((option) => option.id === quality)?.name || quality;
  const mobileParameterSummary = [
    selectedModelName,
    selectedAspectRatioName,
    modelConfig.supportsQuality ? selectedQualityName : null,
    modelConfig.supportsResolution ? resolution.toUpperCase() : null,
    `${quantity}张`,
    creditsEnabled ? `消耗 ${creditCost} 积分` : null,
  ].filter(Boolean).join(" · ");

  function hasDraggedFiles(event: DragEvent<HTMLDivElement>) {
    return Array.from(event.dataTransfer.types).includes("Files");
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDraggingReferenceImage(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsDraggingReferenceImage(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    setIsDraggingReferenceImage(false);

    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );
    if (files.length > 0) onFilesSelect(files);
  }

  return (
    <div className="bg-transparent px-2 py-1.5 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:px-4 sm:py-3">
      <div className="container mx-auto max-w-3xl">
        <div
          className={`relative rounded-2xl border bg-muted/25 p-2.5 shadow-sm transition sm:p-3 ${
            isDraggingReferenceImage
              ? "border-primary/70 ring-2 ring-primary/30"
              : "border-border/80"
          }`}
          onDragEnter={handleDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDraggingReferenceImage && (
            <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-xl border border-dashed border-primary/70 bg-background/80 text-sm font-medium text-foreground shadow-sm">
              拖放图片到这里
            </div>
          )}
          {referenceImages.length > 0 && (
            <div className="mb-2 flex max-h-12 flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden md:mb-3 md:max-h-none md:flex-wrap md:overflow-visible">
              {referenceImages.map((image) => (
                <div
                  key={image.id}
                  className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-background/80 md:h-14 md:w-14"
                >
                  <button
                    type="button"
                    onClick={() => setPreviewReferenceImage(image)}
                    className="block h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`预览参考图 ${image.name}`}
                  >
                    <img
                      src={image.dataUrl}
                      alt={image.name}
                      className="h-full w-full object-cover transition group-hover:scale-[1.04]"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveReferenceImage(image.id)}
                    className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5 text-muted-foreground shadow-sm transition hover:text-foreground"
                    aria-label="移除附件"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <FileImage className="h-3.5 w-3.5" />
                {referenceImages.length}/10
              </span>
            </div>
          )}

          <Textarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={onPromptKeyDown}
            onCompositionStart={onPromptCompositionStart}
            onCompositionEnd={onPromptCompositionEnd}
            onPaste={onPromptPaste}
            placeholder="描述你想要生成的图片..."
            rows={1}
            maxLength={1000}
            className="field-sizing-content max-h-24 min-h-10 resize-none border-0 bg-transparent px-1 py-1 text-base shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0 md:max-h-40 md:min-h-12 md:py-1.5 md:text-sm dark:bg-transparent"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              if (files.length > 0) onFilesSelect(files);
              event.target.value = "";
            }}
          />

          <div className="mt-1.5 md:hidden">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="relative size-10 shrink-0 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                aria-label="上传参考图"
              >
                <Paperclip className="h-5 w-5" />
                {referenceImages.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {referenceImages.length}
                  </span>
                )}
              </Button>
              <button
                type="button"
                onClick={() => setMobileSettingsOpen(true)}
                className="min-w-0 flex-1 truncate rounded-full border border-border/70 bg-background/55 px-3 py-2 text-left text-xs text-muted-foreground"
                aria-label="打开生成参数"
              >
                {mobileParameterSummary}
              </button>
              <Button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit}
                size="icon"
                className="size-10 shrink-0 rounded-full"
                aria-label="生成图片"
                title={!apiConfigured ? "管理员尚未配置图片 API" : prompt.trim() ? "生成图片" : "请输入提示词后生成图片"}
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <ArrowUp className="h-5 w-5" />
                )}
              </Button>
            </div>
            {referenceImages.length > 0 && (
              <p className="sr-only">
                已上传 {referenceImages.length} 张参考图
              </p>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="mt-3 hidden gap-3 md:flex md:flex-row md:items-end md:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <select
                value={model}
                onChange={(event) => onModelChange(event.target.value)}
                className="h-9 w-auto min-w-0 rounded-lg border border-border/70 bg-background/70 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="模型"
              >
                {imageModels.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>

              <select
                value={aspectRatio}
                onChange={(event) => onAspectRatioChange(event.target.value)}
                className="h-9 w-auto min-w-0 rounded-lg border border-border/70 bg-background/70 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="图片尺寸"
              >
                {aspectRatioOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>

              {modelConfig.supportsQuality && (
                <select
                  value={quality}
                  onChange={(event) => onQualityChange(event.target.value as ImageQuality)}
                  className="h-9 w-auto min-w-0 rounded-lg border border-border/70 bg-background/70 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Quality"
                >
                  {AVAILABLE_QUALITIES.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              )}

              {modelConfig.supportsResolution && (
                <select
                  value={resolution}
                  onChange={(event) => onResolutionChange(event.target.value as ImageResolution)}
                  className="h-9 w-auto min-w-0 rounded-lg border border-border/70 bg-background/70 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Resolution"
                >
                  {resolutionOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={quantity}
                onChange={(event) => onQuantityChange(parseInt(event.target.value, 10))}
                className="h-9 w-auto min-w-0 rounded-lg border border-border/70 bg-background/70 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="单次数量"
              >
                {Array.from({ length: 4 }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {value} 张
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-lg"
                onClick={() => fileInputRef.current?.click()}
                aria-label="上传参考图"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-3">
              {creditsEnabled && <span className="text-[11px] leading-none text-muted-foreground">消耗 {creditCost} 积分</span>}
              <Button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit}
                size="icon"
                className="h-10 w-10 rounded-xl"
                aria-label="生成图片"
                title={!apiConfigured ? "管理员尚未配置图片 API" : prompt.trim() ? "生成图片" : "请输入提示词后生成图片"}
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <ArrowUp className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Dialog open={mobileSettingsOpen} onOpenChange={setMobileSettingsOpen}>
        <DialogContent className="bottom-0 top-auto max-w-none translate-y-0 gap-4 rounded-b-none rounded-t-2xl p-4 sm:hidden">
          <DialogTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-4 w-4" />
            移动端生成参数
          </DialogTitle>
          <DialogDescription className="sr-only">
            调整模型、图片尺寸、分辨率、质量和生成数量。
          </DialogDescription>
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium">
              模型
              <select
                value={model}
                onChange={(event) => onModelChange(event.target.value)}
                className="h-11 rounded-lg border border-border/70 bg-background px-3 text-base font-normal focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="模型"
              >
                {imageModels.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              图片尺寸
              <select
                value={aspectRatio}
                onChange={(event) => onAspectRatioChange(event.target.value)}
                className="h-11 rounded-lg border border-border/70 bg-background px-3 text-base font-normal focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="图片尺寸"
              >
                {aspectRatioOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            {modelConfig.supportsQuality && (
              <label className="grid gap-1.5 text-sm font-medium">
                生成质量
                <select
                  value={quality}
                  onChange={(event) => onQualityChange(event.target.value as ImageQuality)}
                  className="h-11 rounded-lg border border-border/70 bg-background px-3 text-base font-normal focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Quality"
                >
                  {AVAILABLE_QUALITIES.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {modelConfig.supportsResolution && (
              <label className="grid gap-1.5 text-sm font-medium">
                分辨率
                <select
                  value={resolution}
                  onChange={(event) => onResolutionChange(event.target.value as ImageResolution)}
                  className="h-11 rounded-lg border border-border/70 bg-background px-3 text-base font-normal focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Resolution"
                >
                  {resolutionOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="grid gap-1.5 text-sm font-medium">
              数量
              <select
                value={quantity}
                onChange={(event) => onQuantityChange(parseInt(event.target.value, 10))}
                className="h-11 rounded-lg border border-border/70 bg-background px-3 text-base font-normal focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="单次数量"
              >
                {Array.from({ length: 4 }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {value} 张
                  </option>
                ))}
              </select>
            </label>
          </div>
          {creditsEnabled && <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">本次消耗</span>
            <span className="font-medium">{creditCost} 积分</span>
          </div>}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!previewReferenceImage}
        onOpenChange={(open) => {
          if (!open) setPreviewReferenceImage(null);
        }}
      >
        {previewReferenceImage && (
          <DialogContent className="max-w-[min(94vw,900px)] gap-3 p-3 sm:max-w-[min(94vw,900px)]">
            <DialogTitle className="sr-only">预览参考图</DialogTitle>
            <DialogDescription className="sr-only">
              {previewReferenceImage.name}
            </DialogDescription>
            <div className="max-h-[78vh] overflow-auto rounded-lg bg-muted">
              <img
                src={previewReferenceImage.dataUrl}
                alt={previewReferenceImage.name}
                className="h-auto w-full"
              />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
