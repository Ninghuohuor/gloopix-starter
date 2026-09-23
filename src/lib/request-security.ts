import { NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export function getClientIpFromHeaders(headers: Headers | { get(name: string): string | null }) {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip") || "unknown";
}

export function rejectCrossSiteRequest(request: Request) {
  if (SAFE_METHODS.has(request.method)) return null;

  const origin = request.headers.get("origin");
  if (!origin) return null;

  const host = request.headers.get("host");
  if (!host) return null;

  try {
    if (new URL(origin).host !== host) {
      return NextResponse.json({ error: "非法请求来源" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "非法请求来源" }, { status: 403 });
  }

  return null;
}
export function rejectLargeRequest(request: Request, maxBytes: number) {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return null;

  const bytes = Number(contentLength);
  if (Number.isFinite(bytes) && bytes > maxBytes) {
    return NextResponse.json({ error: "请求内容过大" }, { status: 413 });
  }

  return null;
}
