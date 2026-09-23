"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DEFAULT_IMAGE_MODELS,
  getImageModelConfig,
  isResolutionCompatibleWithModel,
  type ImageModelConfig,
  type ImageQuality,
  type ImageResolution,
} from "@/lib/image-models";
import { DEFAULT_BRANDING, DEFAULT_FEATURES } from "@/lib/api-settings";
import { containsForbiddenPromptTerm, FORBIDDEN_PROMPT_MESSAGE } from "@/lib/forbidden-prompts";

export type GenerationQuality = ImageQuality;
export type GenerationResolution = ImageResolution;

export type ReferenceImageItem = {
  id: string;
  name: string;
  dataUrl: string;
  size?: number;
};

export interface ChatMessage {
  id: string;
  prompt: string;
  status: "generating" | "completed" | "failed";
  model: string;
  aspectRatio: string;
  quality: GenerationQuality;
  resolution: GenerationResolution;
  quantity: number;
  imageUrls?: string[];
  thumbnailUrls?: string[];
  referenceImages?: ReferenceImageItem[];
  startedAt: number;
  durationSeconds?: number;
  error?: string;
}

type PersistedGenerationTask = {
  id: string;
  prompt: string;
  status: "generating" | "completed" | "failed";
  model: string;
  aspectRatio: string;
  quality: GenerationQuality;
  resolution: GenerationResolution;
  quantity: number;
  imageUrls?: string[];
  thumbnailUrls?: string[];
  startedAt: number;
  durationSeconds?: number;
  error?: string;
};

type RunGenerationInput = {
  promptText: string;
  selectedModel: string;
  selectedAspectRatio: string;
  selectedQuality: GenerationQuality;
  selectedResolution: GenerationResolution;
  selectedQuantity: number;
  selectedReferenceImages: ReferenceImageItem[];
  clearComposer: boolean;
};

type GenerationSessionContextValue = {
  authStatus: "authenticated" | "loading" | "unauthenticated";
  prompt: string;
  setPrompt: (value: string) => void;
  model: string;
  setModel: (value: string) => void;
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
  quality: GenerationQuality;
  setQuality: (value: GenerationQuality) => void;
  resolution: GenerationResolution;
  setResolution: (value: GenerationResolution) => void;
  quantity: number;
  setQuantity: (value: number) => void;
  loading: boolean;
  messages: ChatMessage[];
  referenceImages: ReferenceImageItem[];
  setReferenceImages: (value: ReferenceImageItem[]) => void;
  elapsed: number;
  handleFileSelect: (file: File) => void;
  handleFilesSelect: (files: File[]) => void;
  removeReferenceImage: (id: string) => void;
  runGeneration: (input: RunGenerationInput) => Promise<void>;
  imageModels: ImageModelConfig[];
  apiConfigured: boolean;
  branding: typeof DEFAULT_BRANDING;
  features: typeof DEFAULT_FEATURES;
};

const MAX_REFERENCE_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_REFERENCE_IMAGE_TOTAL_BYTES = 100 * 1024 * 1024;

const GenerationSessionContext = createContext<GenerationSessionContextValue | null>(null);

function getReferenceImageBytes(image: ReferenceImageItem) {
  if (typeof image.size === "number") return image.size;

  const base64 = image.dataUrl.split(",", 2)[1] || "";
  return Math.ceil((base64.length * 3) / 4);
}

function getReferenceImageLimitError(images: ReferenceImageItem[]) {
  const totalBytes = images.reduce((total, image) => total + getReferenceImageBytes(image), 0);
  const oversizedImage = images.find(
    (image) => getReferenceImageBytes(image) > MAX_REFERENCE_IMAGE_BYTES
  );

  if (oversizedImage) {
    return `参考图「${oversizedImage.name || "未命名图片"}」不能超过 20MB，请压缩后再上传`;
  }
  if (totalBytes > MAX_REFERENCE_IMAGE_TOTAL_BYTES) {
    return "参考图总大小不能超过 100MB，请减少图片或压缩后再上传";
  }

  return null;
}

function mergeSyncedGenerationTasks(
  currentMessages: ChatMessage[],
  tasks: PersistedGenerationTask[]
): ChatMessage[] {
  const taskIds = new Set(tasks.map((task) => task.id));
  const syncedMessages: ChatMessage[] = tasks.map((task) => {
    const currentMessage = currentMessages.find((message) => message.id === task.id);
    return currentMessage?.referenceImages
      ? { ...task, referenceImages: currentMessage.referenceImages }
      : task;
  });
  const unsyncedGeneratingMessages = currentMessages.filter(
    (message) => message.status === "generating" && !taskIds.has(message.id)
  );

  return [...syncedMessages, ...unsyncedGeneratingMessages].sort(
    (a, b) => a.startedAt - b.startedAt
  );
}

export function GenerationSessionProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [prompt, setPrompt] = useState("");
  const [imageModels, setImageModels] = useState<ImageModelConfig[]>(DEFAULT_IMAGE_MODELS);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [model, setModel] = useState(DEFAULT_IMAGE_MODELS[0]?.id || "gpt-image-1");
  const [aspectRatio, setAspectRatio] = useState("auto");
  const [quality, setQuality] = useState<GenerationQuality>("low");
  const [resolution, setResolution] = useState<GenerationResolution>("1k");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [referenceImages, setReferenceImages] = useState<ReferenceImageItem[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const taskPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeUserIdRef = useRef<string | null | undefined>(undefined);
  const sessionGenerationVersionRef = useRef(0);
  const configDefaultsAppliedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (taskPollRef.current) clearInterval(taskPollRef.current);
    };
  }, []);

  useEffect(() => {
    const config = getImageModelConfig(model, imageModels);

    if (!config.supportsQuality && quality !== config.defaultQuality) {
      setQuality(config.defaultQuality);
    }

    if (
      (!config.supportsResolution || !isResolutionCompatibleWithModel(model, resolution, imageModels)) &&
      resolution !== config.defaultResolution
    ) {
      setResolution(config.defaultResolution);
    }
  }, [imageModels, model, quality, resolution]);

  const refreshAppConfig = useCallback(async () => {
    try {
      const response = await fetch("/api/config", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as {
        hasApiKey?: boolean;
        models?: ImageModelConfig[];
        branding?: typeof DEFAULT_BRANDING;
        features?: typeof DEFAULT_FEATURES;
        generationDefaults?: { defaultModel: string; defaultResolution: GenerationResolution; defaultQuantity: number };
      };
      const nextModels = data.models?.length ? data.models : DEFAULT_IMAGE_MODELS;
      setImageModels(nextModels);
      if (data.features) setFeatures(data.features);
      if (data.branding) {
        setBranding(data.branding);
        document.title = data.branding.browserTitle;
      }
      setModel((current) => {
        if (!configDefaultsAppliedRef.current && data.generationDefaults?.defaultModel) return data.generationDefaults.defaultModel;
        return nextModels.some((item) => item.id === current) ? current : nextModels[0].id;
      });
      if (!configDefaultsAppliedRef.current && data.generationDefaults) {
        setResolution(data.generationDefaults.defaultResolution);
        setQuantity(data.generationDefaults.defaultQuantity);
        configDefaultsAppliedRef.current = true;
      }
    } catch {
      // The starter defaults remain usable while configuration is unavailable.
    }
  }, []);

  useEffect(() => {
    const selected = imageModels.find((item) => item.id === model) as (ImageModelConfig & { configured?: boolean }) | undefined;
    setApiConfigured(selected?.configured ?? false);
  }, [imageModels, model]);

  useEffect(() => {
    void refreshAppConfig();
    window.addEventListener("app-config-updated", refreshAppConfig);
    return () => window.removeEventListener("app-config-updated", refreshAppConfig);
  }, [refreshAppConfig]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const resetGenerationSession = useCallback(() => {
    sessionGenerationVersionRef.current += 1;
    stopTimer();
    setPrompt("");
    setMessages([]);
    setReferenceImages([]);
    setLoading(false);
    setElapsed(0);
  }, [stopTimer]);

  const syncGenerationTasks = useCallback(async () => {
    if (status !== "authenticated") return;

    try {
      const res = await fetch("/api/user/generation-tasks", { cache: "no-store" });
      if (!res.ok) return;

      const data = (await res.json()) as { tasks?: PersistedGenerationTask[] };
      const tasks = data.tasks || [];
      const hasGeneratingTask = tasks.some((task) => task.status === "generating");
      const activeTask = tasks.find((task) => task.status === "generating");

      if (tasks.length > 0 || !loading) {
        setMessages((currentMessages) =>
          mergeSyncedGenerationTasks(currentMessages, tasks)
        );
      }

      if (hasGeneratingTask && activeTask) {
        setLoading(true);
        setElapsed(Math.max(0, Math.round((Date.now() - activeTask.startedAt) / 1000)));
        if (!timerRef.current) {
          timerRef.current = setInterval(() => setElapsed((value) => value + 1), 1000);
        }
        return;
      }

      stopTimer();
      setLoading(false);
      if (tasks.some((task) => task.status === "completed" || task.status === "failed")) {
        window.dispatchEvent(new Event("credits-updated"));
      }
    } catch {
      // Recovery polling is best-effort; normal generation errors are handled by runGeneration.
    }
  }, [loading, status, stopTimer]);

  useEffect(() => {
    if (status === "loading") return;

    const currentUserId = status === "authenticated" ? session?.user?.id ?? null : null;
    if (activeUserIdRef.current === undefined) {
      activeUserIdRef.current = currentUserId;
      return;
    }

    if (activeUserIdRef.current !== currentUserId) {
      activeUserIdRef.current = currentUserId;
      resetGenerationSession();
    }
  }, [resetGenerationSession, session?.user?.id, status]);

  useEffect(() => {
    if (taskPollRef.current) {
      clearInterval(taskPollRef.current);
      taskPollRef.current = null;
    }

    if (status !== "authenticated" || pathname !== "/") return;

    syncGenerationTasks();
    taskPollRef.current = setInterval(syncGenerationTasks, 5000);

    return () => {
      if (taskPollRef.current) {
        clearInterval(taskPollRef.current);
        taskPollRef.current = null;
      }
    };
  }, [pathname, session?.user?.id, status, syncGenerationTasks]);

  function handleFilesSelect(files: File[]) {
    const remainingSlots = 10 - referenceImages.length;
    if (remainingSlots <= 0) {
      toast.error("最多上传 10 张参考图");
      return;
    }

    const selectedFiles = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast.error("最多上传 10 张参考图");
    }

    let pendingTotalBytes = referenceImages.reduce(
      (total, image) => total + getReferenceImageBytes(image),
      0
    );

    selectedFiles.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error("请选择图片文件");
        return;
      }
      if (file.size > MAX_REFERENCE_IMAGE_BYTES) {
        toast.error(`参考图「${file.name || "未命名图片"}」不能超过 20MB，请压缩后再上传`);
        return;
      }
      if (pendingTotalBytes + file.size > MAX_REFERENCE_IMAGE_TOTAL_BYTES) {
        toast.error("参考图总大小不能超过 100MB，请减少图片或压缩后再上传");
        return;
      }
      pendingTotalBytes += file.size;

      const reader = new FileReader();
      reader.onload = () => {
        setReferenceImages((currentImages) => [
          ...currentImages,
          {
            id: crypto.randomUUID(),
            name: file.name || "参考图片",
            dataUrl: reader.result as string,
            size: file.size,
          },
        ].slice(0, 10));
      };
      reader.readAsDataURL(file);
    });
  }

  function handleFileSelect(file: File) {
    handleFilesSelect([file]);
  }

  function removeReferenceImage(id: string) {
    setReferenceImages((currentImages) => currentImages.filter((image) => image.id !== id));
  }

  async function runGeneration({
    promptText,
    selectedModel,
    selectedAspectRatio,
    selectedQuality,
    selectedResolution,
    selectedQuantity,
    selectedReferenceImages,
    clearComposer,
  }: RunGenerationInput) {
    if (loading) return;

    if (status !== "authenticated") {
      toast.error("请先登录");
      router.push("/login");
      return;
    }

    const trimmedPrompt = promptText.trim();
    if (!trimmedPrompt) {
      toast.error("请输入图片描述");
      return;
    }

    const referenceImageLimitError = getReferenceImageLimitError(selectedReferenceImages);
    if (referenceImageLimitError) {
      toast.error(referenceImageLimitError);
      return;
    }

    if (containsForbiddenPromptTerm(trimmedPrompt)) {
      const blockedMessage: ChatMessage = {
        id: crypto.randomUUID(),
        prompt: trimmedPrompt,
        status: "failed",
        model: selectedModel,
        aspectRatio: selectedAspectRatio,
        quality: selectedQuality,
        resolution: selectedResolution,
        quantity: selectedQuantity,
        referenceImages: selectedReferenceImages.length > 0 ? selectedReferenceImages : undefined,
        startedAt: Date.now(),
        error: FORBIDDEN_PROMPT_MESSAGE,
      };

      setMessages((prev) => [...prev, blockedMessage]);
      if (clearComposer) {
        setPrompt("");
        setReferenceImages([]);
      }
      toast.error(FORBIDDEN_PROMPT_MESSAGE);
      return;
    }

    setLoading(true);
    setElapsed(0);
    stopTimer();
    timerRef.current = setInterval(() => setElapsed((value) => value + 1), 1000);
    const generationVersion = sessionGenerationVersionRef.current;

    const requestId = crypto.randomUUID();
    const startedAt = Date.now();
    const pendingMessage: ChatMessage = {
      id: requestId,
      prompt: trimmedPrompt,
      status: "generating",
      model: selectedModel,
      aspectRatio: selectedAspectRatio,
      quality: selectedQuality,
      resolution: selectedResolution,
      quantity: selectedQuantity,
      referenceImages: selectedReferenceImages.length > 0 ? selectedReferenceImages : undefined,
      startedAt,
    };

    setMessages((prev) => [...prev, pendingMessage]);
    if (clearComposer) {
      setPrompt("");
      setReferenceImages([]);
    }

    const body: {
      prompt: string;
      model: string;
      requestId: string;
      aspectRatio: string;
      quality: GenerationQuality;
      resolution: GenerationResolution;
      quantity: number;
      referenceImages?: string[];
    } = {
      prompt: trimmedPrompt,
      model: selectedModel,
      requestId,
      aspectRatio: selectedAspectRatio,
      quality: selectedQuality,
      resolution: selectedResolution,
      quantity: selectedQuantity,
    };
    if (selectedReferenceImages.length > 0) {
      body.referenceImages = selectedReferenceImages.map((image) => image.dataUrl);
    }

    let keepGenerationActive = false;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (sessionGenerationVersionRef.current !== generationVersion) return;

      if (!res.ok) {
        const error = data.error || "图片生成失败";
        setMessages((prev) =>
          prev.map((item) =>
            item.id === requestId
              ? {
                  ...item,
                  status: "failed",
                  error,
                  durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
                }
              : item
          )
        );
        toast.error(error);
        return;
      }

      if (data.status === "queued") {
        keepGenerationActive = true;
        toast.success("已开始生成");
        return;
      }

      setMessages((prev) =>
        prev.map((item) =>
          item.id === requestId
            ? {
                ...item,
                status: "completed",
                durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
                imageUrls: data.images.map((image: { imageUrl: string }) => image.imageUrl),
                thumbnailUrls: data.images.map(
                  (image: { imageUrl: string; thumbnailUrl?: string }) =>
                    image.thumbnailUrl || image.imageUrl
                ),
              }
            : item
        )
      );
      window.dispatchEvent(new Event("credits-updated"));
      toast.success("图片生成成功");
    } catch {
      if (sessionGenerationVersionRef.current !== generationVersion) return;
      setMessages((prev) =>
        prev.map((item) =>
          item.id === requestId
            ? {
                ...item,
                status: "failed",
                error: "图片生成失败",
                durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
              }
            : item
        )
      );
      toast.error("图片生成失败");
    } finally {
      if (sessionGenerationVersionRef.current === generationVersion && !keepGenerationActive) {
        stopTimer();
        setLoading(false);
      }
    }
  }

  return (
    <GenerationSessionContext.Provider
      value={{
        prompt,
        authStatus: status,
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
        setReferenceImages,
        elapsed,
        handleFileSelect,
        handleFilesSelect,
        removeReferenceImage,
        runGeneration,
        imageModels,
        apiConfigured,
        branding,
        features,
      }}
    >
      {children}
    </GenerationSessionContext.Provider>
  );
}

export function useGenerationSession() {
  const value = useContext(GenerationSessionContext);
  if (!value) {
    throw new Error("useGenerationSession must be used within GenerationSessionProvider");
  }
  return value;
}
