const rateMap = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = rateMap.get(key) ?? [];

  const valid = timestamps.filter((t) => now - t < windowMs);

  if (valid.length >= limit) {
    rateMap.set(key, valid);
    return { success: false, remaining: 0 };
  }

  valid.push(now);
  rateMap.set(key, valid);
  return { success: true, remaining: limit - valid.length };
}
