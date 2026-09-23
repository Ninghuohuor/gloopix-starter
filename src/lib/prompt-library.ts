export const DEFAULT_PROMPT_LIBRARY_MODEL = "gpt-image-2";

export type PromptLibraryImageRecord = {
  imageUrl: string;
  imageUrls?: string | null;
  model?: string | null;
};

export function parsePromptImageUrls(item: PromptLibraryImageRecord) {
  if (item.imageUrls) {
    try {
      const parsed = JSON.parse(item.imageUrls);
      if (Array.isArray(parsed)) {
        const urls = parsed.filter((url): url is string => typeof url === "string" && url.length > 0);
        if (urls.length > 0) return urls;
      }
    } catch {
      // Fall back to the legacy single-image field below.
    }
  }

  return item.imageUrl ? [item.imageUrl] : [];
}

export function serializePromptImageUrls(imageUrls: string[]) {
  return JSON.stringify(imageUrls.filter((url) => url.length > 0).slice(0, 10));
}

export function formatPromptLibraryItem<T extends PromptLibraryImageRecord>(item: T) {
  const imageUrls = parsePromptImageUrls(item);
  return {
    ...item,
    imageUrl: imageUrls[0] || item.imageUrl,
    imageUrls,
    model: item.model || DEFAULT_PROMPT_LIBRARY_MODEL,
  };
}
