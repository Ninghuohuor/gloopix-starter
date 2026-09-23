export type AspectRatio = {
  width: number;
  height: number;
  text: string;
};

export type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";

export function parseAspectRatio(prompt: string): AspectRatio | null {
  const match = prompt.match(/(?:^|[^\d])(\d{1,2})\s*[:：]\s*(\d{1,2})(?:[^\d]|$)/);
  if (!match) return null;

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isInteger(width) || !Number.isInteger(height)) return null;
  if (width <= 0 || height <= 0) return null;
  if (width > 32 || height > 32) return null;

  return { width, height, text: `${width}:${height}` };
}

export function inferAspectRatio(prompt: string): AspectRatio | null {
  const explicitRatio = parseAspectRatio(prompt);
  if (explicitRatio) return explicitRatio;

  if (/(抖音|TikTok|tiktok|手机截图|手机屏幕|竖屏|直播截图|短视频)/.test(prompt)) {
    return { width: 9, height: 16, text: "9:16" };
  }

  return null;
}

export function parseAspectRatioOption(option: string): AspectRatio | null {
  if (option === "auto") return null;
  return parseAspectRatio(option);
}

export function resolveAspectRatio(prompt: string, option: string = "auto"): AspectRatio | null {
  const selectedRatio = parseAspectRatioOption(option);
  if (selectedRatio) return selectedRatio;
  return inferAspectRatio(prompt);
}

export function chooseGenerationSize(aspectRatio: AspectRatio | null): ImageSize {
  if (!aspectRatio) return "1024x1024";

  const ratio = aspectRatio.width / aspectRatio.height;
  if (ratio > 1.08) return "1536x1024";
  if (ratio < 0.92) return "1024x1536";
  return "1024x1024";
}

export function targetCropSize(
  sourceWidth: number,
  sourceHeight: number,
  aspectRatio: AspectRatio
) {
  const targetRatio = aspectRatio.width / aspectRatio.height;
  const sourceRatio = sourceWidth / sourceHeight;

  if (sourceRatio > targetRatio) {
    return {
      width: Math.floor(sourceHeight * targetRatio),
      height: sourceHeight,
    };
  }

  return {
    width: sourceWidth,
    height: Math.floor(sourceWidth / targetRatio),
  };
}

export function buildImagePrompt(prompt: string, aspectRatio: AspectRatio | null = inferAspectRatio(prompt)) {
  if (!aspectRatio) return prompt;

  return `${prompt}

构图要求：输出画面适合 ${aspectRatio.text} 比例。主体居中，关键内容远离边缘，四周留出安全边距。参考图里的边缘界面、文字和人物不要被裁切或截断。不要黑边、白边、留边、letterbox 或 pillarbox。`;
}

export function buildReferenceImagePrompt(prompt: string, hasReferenceImages: boolean) {
  if (!hasReferenceImages) return prompt;

  return `${prompt}

参考图要求：参考图只作为主体、材质、色彩或构图的参考。请生成一张新的图片，不要原样返回参考图，不要只复制或复刻输入图片。`;
}
