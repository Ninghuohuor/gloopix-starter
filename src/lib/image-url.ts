export function isRemoteImageUrl(imageUrl: string) {
  return /^https?:\/\//i.test(imageUrl);
}

export function shouldBypassImageOptimizer(imageUrl: string) {
  return (
    isRemoteImageUrl(imageUrl) ||
    imageUrl.startsWith("/uploads/")
  );
}
