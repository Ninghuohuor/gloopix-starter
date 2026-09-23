export type StoredGeneratedImage = {
  imageUrl: string;
  thumbnailUrl?: string;
};

type PersistGeneratedImageInput = {
  localFilePath: string;
  localImageUrl: string;
  filename: string;
};

export async function persistGeneratedImage({
  localImageUrl,
}: PersistGeneratedImageInput): Promise<StoredGeneratedImage> {
  return { imageUrl: localImageUrl };
}
