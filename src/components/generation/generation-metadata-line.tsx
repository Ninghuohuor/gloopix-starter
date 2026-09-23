import {
  AVAILABLE_QUALITIES,
  AVAILABLE_RESOLUTIONS,
  getImageModelConfig,
  type ImageQuality,
  type ImageResolution,
} from "@/lib/image-models";

type GenerationMetadataLineProps = {
  model: string;
  aspectRatio: string;
  resolution: ImageResolution | string;
  quality?: ImageQuality | string;
};

function getResolutionName(resolution: string) {
  return AVAILABLE_RESOLUTIONS.find((item) => item.id === resolution)?.name || resolution;
}

function getQualityName(quality: string) {
  return AVAILABLE_QUALITIES.find((item) => item.id === quality)?.name || quality;
}

export function GenerationMetadataLine({
  model,
  aspectRatio,
  resolution,
  quality,
}: GenerationMetadataLineProps) {
  const modelConfig = getImageModelConfig(model);
  const items = [
    `模型：${modelConfig.name}`,
    `尺寸：${aspectRatio}`,
    `分辨率：${getResolutionName(resolution)}`,
  ];

  if (modelConfig.supportsQuality && quality) {
    items.push(`质量：${getQualityName(quality)}`);
  }

  return (
    <p className="text-xs text-muted-foreground" aria-label="生成参数">
      {items.join(" · ")}
    </p>
  );
}
