import path from "path";

export function getLocalUploadPath(imageUrl: string) {
  if (!imageUrl.startsWith("/uploads/")) return null;

  const uploadRoot = path.join(process.cwd(), "public", "uploads");
  const normalizedPath = path.normalize(imageUrl.replace(/^\/uploads\//, ""));
  const filepath = path.join(uploadRoot, normalizedPath);

  if (!filepath.startsWith(uploadRoot + path.sep)) return null;

  return filepath;
}
