export const QUALITY_IDS = ["low", "medium", "high"] as const;
export const RESOLUTION_IDS = ["1k", "2k", "4k"] as const;
export const FOUR_K_COMPATIBLE_ASPECT_RATIOS = ["16:9", "9:16", "2:1", "1:2", "21:9", "9:21"] as const;
export const ASPECT_RATIO_OPTIONS = [
  "auto",
  "3:4",
  "4:3",
  "1:1",
  "4:5",
  "5:4",
  "16:9",
  "9:16",
  "2:3",
  "3:2",
  "21:9",
  "9:21",
  "1:2",
  "2:1",
] as const;
export const NANO_BANANA_ASPECT_RATIOS = [
  "1:1",
  "3:2",
  "2:3",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
  "5:4",
  "4:5",
  "21:9",
] as const;

export type ImageModelId = string;
export type ImageQuality = (typeof QUALITY_IDS)[number];
export type ImageResolution = (typeof RESOLUTION_IDS)[number];
export type ImageAspectRatio = (typeof ASPECT_RATIO_OPTIONS)[number];

export type ImageModelConfig = {
  id: ImageModelId;
  name: string;
  supportsQuality: boolean;
  supportsResolution: boolean;
  supportsAspectRatio?: boolean;
  defaultQuality: ImageQuality;
  defaultResolution: ImageResolution;
  supportedResolutions?: readonly ImageResolution[];
  supportedAspectRatios?: readonly ImageAspectRatio[];
  creditCost: Record<ImageResolution, Record<ImageQuality, number>>;
  enabled?: boolean;
};

export const IMAGE_MODEL_CONFIGS = [
  {
    id: "gpt-image-2",
    name: "GPT Image 2",
    supportsQuality: false,
    supportsResolution: true,
    defaultQuality: "low",
    defaultResolution: "1k",
    supportedResolutions: ["1k", "2k"],
    creditCost: {
      "1k": { low: 10, medium: 10, high: 10 },
      "2k": { low: 20, medium: 20, high: 20 },
      "4k": { low: 40, medium: 40, high: 40 },
    },
  },
  {
    id: "gpt-image-2-official",
    name: "GPT Image 2 Official",
    supportsQuality: true,
    supportsResolution: true,
    defaultQuality: "low",
    defaultResolution: "1k",
    creditCost: {
      "1k": { low: 10, medium: 60, high: 240 },
      "2k": { low: 20, medium: 200, high: 930 },
      "4k": { low: 40, medium: 400, high: 1800 },
    },
  },
  {
    id: "gpt-image-2-temporary",
    name: "GPT Image 2 备用通道",
    supportsQuality: false,
    supportsResolution: true,
    defaultQuality: "low",
    defaultResolution: "1k",
    supportedResolutions: ["1k", "2k"],
    supportedAspectRatios: ["auto"],
    creditCost: {
      "1k": { low: 10, medium: 10, high: 10 },
      "2k": { low: 20, medium: 20, high: 20 },
      "4k": { low: 40, medium: 40, high: 40 },
    },
  },
  {
    id: "gemini-3.1-flash-image-preview",
    name: "Nano Banana 2",
    supportsQuality: false,
    supportsResolution: true,
    defaultQuality: "low",
    defaultResolution: "1k",
    supportedAspectRatios: NANO_BANANA_ASPECT_RATIOS,
    creditCost: {
      "1k": { low: 40, medium: 40, high: 40 },
      "2k": { low: 50, medium: 50, high: 50 },
      "4k": { low: 80, medium: 80, high: 80 },
    },
  },
  {
    id: "gemini-3.1-flash-image-preview-official",
    name: "Nano Banana 2 Official",
    supportsQuality: false,
    supportsResolution: true,
    defaultQuality: "low",
    defaultResolution: "1k",
    supportedAspectRatios: NANO_BANANA_ASPECT_RATIOS,
    creditCost: {
      "1k": { low: 70, medium: 70, high: 70 },
      "2k": { low: 100, medium: 100, high: 100 },
      "4k": { low: 150, medium: 150, high: 150 },
    },
  },
] as const satisfies readonly ImageModelConfig[];

const imageModelConfigs: readonly ImageModelConfig[] = IMAGE_MODEL_CONFIGS;
const HIDDEN_MODEL_IDS = new Set<ImageModelId>(["gpt-image-2-temporary"]);
const selectableImageModelConfigs = imageModelConfigs.filter(
  (model) => !HIDDEN_MODEL_IDS.has(model.id)
);

export const AVAILABLE_MODELS = selectableImageModelConfigs.map(({ id, name }) => ({ id, name }));
export const MODEL_IDS = selectableImageModelConfigs.map((model) => model.id) as [
  ImageModelId,
  ...ImageModelId[],
];

export const DEFAULT_IMAGE_MODELS: ImageModelConfig[] = selectableImageModelConfigs.filter((model) => model.id === "gpt-image-2").map((model) => ({
  ...model,
  enabled: true,
  supportedResolutions: model.supportedResolutions ? [...model.supportedResolutions] : undefined,
  supportedAspectRatios: model.supportedAspectRatios ? [...model.supportedAspectRatios] : undefined,
  creditCost: {
    "1k": { ...model.creditCost["1k"] },
    "2k": { ...model.creditCost["2k"] },
    "4k": { ...model.creditCost["4k"] },
  },
}));

export const AVAILABLE_QUALITIES = [
  { id: "low", name: "Low" },
  { id: "medium", name: "Medium" },
  { id: "high", name: "High" },
] as const;

export const AVAILABLE_RESOLUTIONS = [
  { id: "1k", name: "1K" },
  { id: "2k", name: "2K" },
  { id: "4k", name: "4K" },
] as const;

export const AVAILABLE_ASPECT_RATIOS = ASPECT_RATIO_OPTIONS.map((id) => ({
  id,
  name: id,
}));

export function getImageModelConfig(modelId: string, models?: readonly ImageModelConfig[]) {
  return models?.find((model) => model.id === modelId) ||
    imageModelConfigs.find((model) => model.id === modelId) ||
    models?.[0] ||
    imageModelConfigs[0];
}

export function isAspectRatioCompatibleWithResolution(aspectRatio: string, resolution: string) {
  if (resolution !== "4k") return true;
  return FOUR_K_COMPATIBLE_ASPECT_RATIOS.includes(
    aspectRatio as (typeof FOUR_K_COMPATIBLE_ASPECT_RATIOS)[number]
  );
}

export function isAspectRatioCompatibleWithModel(modelId: string, aspectRatio: string, models?: readonly ImageModelConfig[]) {
  const supportedAspectRatios = getImageModelConfig(modelId, models).supportedAspectRatios;
  if (!supportedAspectRatios) return true;
  return supportedAspectRatios.includes(aspectRatio as ImageAspectRatio);
}

export function getAvailableAspectRatiosForModel(modelId: string, models?: readonly ImageModelConfig[]) {
  return AVAILABLE_ASPECT_RATIOS.filter((option) =>
    isAspectRatioCompatibleWithModel(modelId, option.id, models)
  );
}

export function getAvailableResolutionsForModel(modelId: string) {
  const supportedResolutions = getImageModelConfig(modelId).supportedResolutions;
  if (!supportedResolutions) return AVAILABLE_RESOLUTIONS;
  return AVAILABLE_RESOLUTIONS.filter((option) => supportedResolutions.includes(option.id));
}

export function isResolutionCompatibleWithModel(modelId: string, resolution: string, models?: readonly ImageModelConfig[]) {
  const supportedResolutions = getImageModelConfig(modelId, models).supportedResolutions;
  if (!supportedResolutions) return true;
  return supportedResolutions.includes(resolution as ImageResolution);
}

export function getDefaultAspectRatioForModel(modelId: string, resolution = "1k", models?: readonly ImageModelConfig[]) {
  return (
    getAvailableAspectRatiosForModel(modelId, models).find((option) =>
      isAspectRatioCompatibleWithResolution(option.id, resolution)
    )?.id || "auto"
  );
}

export function calculateImageCreditCost({
  model,
  quality,
  resolution,
  quantity,
  models,
}: {
  model: string;
  quality?: ImageQuality;
  resolution?: ImageResolution;
  quantity: number;
  models?: readonly ImageModelConfig[];
}) {
  const config = getImageModelConfig(model, models);
  const selectedQuality = quality || config.defaultQuality;
  const selectedResolution = resolution || config.defaultResolution;
  return config.creditCost[selectedResolution][selectedQuality] * quantity;
}
