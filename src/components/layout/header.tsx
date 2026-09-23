"use client";

import { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Menu } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ADMIN_DASHBOARD_PATH } from "@/lib/route-targets";
import { useGenerationSession } from "@/components/generation/generation-session-provider";

interface Announcement {
  id: string;
  content: string;
  imageUrl: string | null;
  updatedAt: string;
}

const ANNOUNCEMENT_READ_KEY = "gloopix-announcement-read-id";
const ANNOUNCEMENT_REFRESH_INTERVAL_MS = 30 * 1000;
const ANNOUNCEMENT_URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
const ANNOUNCEMENT_TRAILING_PUNCTUATION_PATTERN = /[),.，。！？!?;；:：]+$/;

function getAnnouncementReadMarker(announcement: Announcement) {
  return `${announcement.id}:${announcement.updatedAt}`;
}

function isAnnouncementRead(announcement: Announcement) {
  const storedValue = localStorage.getItem(ANNOUNCEMENT_READ_KEY);
  return storedValue === getAnnouncementReadMarker(announcement) || storedValue === announcement.id;
}

function normalizeAnnouncementUrl(url: string) {
  return url.startsWith("www.") ? `https://${url}` : url;
}

function splitAnnouncementUrl(value: string) {
  const trailing = value.match(ANNOUNCEMENT_TRAILING_PUNCTUATION_PATTERN)?.[0] || "";
  return {
    url: trailing ? value.slice(0, -trailing.length) : value,
    trailing,
  };
}

function renderAnnouncementContent(content: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(ANNOUNCEMENT_URL_PATTERN)) {
    const rawMatch = match[0];
    const index = match.index ?? 0;
    const { url, trailing } = splitAnnouncementUrl(rawMatch);

    if (index > lastIndex) {
      parts.push(content.slice(lastIndex, index));
    }

    parts.push(
      <a
        key={`${url}-${index}`}
        href={normalizeAnnouncementUrl(url)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-4 hover:text-primary/80"
      >
        {url}
      </a>
    );

    if (trailing) parts.push(trailing);
    lastIndex = index + rawMatch.length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

export function Header() {
  const { data: session, status } = useSession();
  const { branding, features } = useGenerationSession();
  const [credits, setCredits] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [hasUnreadAnnouncement, setHasUnreadAnnouncement] = useState(false);

  const refreshAnnouncement = useCallback(() => {
    if (status !== "authenticated" || !features.announcementsEnabled) return;

    fetch("/api/announcements/current", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const current = d.announcement as Announcement | null;
        setAnnouncement(current);
        if (!current) {
          setHasUnreadAnnouncement(false);
          return;
        }
        setHasUnreadAnnouncement(!isAnnouncementRead(current));
      })
      .catch(() => undefined);
  }, [features.announcementsEnabled, status]);

  useEffect(() => {
    if (status !== "authenticated" || !features.announcementsEnabled) {
      setAnnouncement(null);
      setAnnouncementOpen(false);
      setHasUnreadAnnouncement(false);
      return;
    }

    refreshAnnouncement();
    const intervalId = window.setInterval(refreshAnnouncement, ANNOUNCEMENT_REFRESH_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") refreshAnnouncement();
    }

    window.addEventListener("focus", refreshAnnouncement);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshAnnouncement);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [features.announcementsEnabled, refreshAnnouncement, status]);

  useEffect(() => {
    if (status === "authenticated" && features.creditsEnabled) {
      fetch("/api/user/credits")
        .then((r) => r.json())
        .then((d) => setCredits(d.credits));
    } else {
      setCredits(null);
    }
  }, [features.creditsEnabled, status]);

  // Allow other components to trigger a refresh via custom event
  useEffect(() => {
    function handleRefresh() {
      if (status === "authenticated" && features.creditsEnabled) {
        fetch("/api/user/credits")
          .then((r) => r.json())
          .then((d) => setCredits(d.credits));
      }
    }
    window.addEventListener("credits-updated", handleRefresh);
    return () => window.removeEventListener("credits-updated", handleRefresh);
  }, [features.creditsEnabled, status]);

  function handleAnnouncementOpen(open: boolean) {
    setAnnouncementOpen(open);
    if (open && announcement) {
      localStorage.setItem(ANNOUNCEMENT_READ_KEY, getAnnouncementReadMarker(announcement));
      setHasUnreadAnnouncement(false);
    }
  }

  const publicNavigationLinks = [
    { href: "/", label: "生成" },
    ...(features.promptLibraryEnabled ? [{ href: "/prompts", label: "提示词" }] : []),
  ];
  const authenticatedNavigationLinks = [
    { href: "/", label: "生成" },
    ...(features.creditsEnabled ? [{ href: "/redeem", label: "积分" }] : []),
    { href: "/history", label: "历史" },
    ...(features.promptLibraryEnabled ? [{ href: "/prompts", label: "提示词" }] : []),
    ...(session?.user?.role === "ADMIN"
      ? [{ href: ADMIN_DASHBOARD_PATH, label: "管理后台" }]
      : []),
  ];
  const navigationLinks = session?.user ? authenticatedNavigationLinks : publicNavigationLinks;

  return (
    <>
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center px-3 sm:px-4">
          <Link
            href="/"
            aria-label="返回生图页面"
            className="mr-2 flex items-center space-x-2 font-bold transition-colors hover:text-foreground/80 sm:mr-6"
          >
            {branding.logoUrl ? (
              // Configured remote logos intentionally bypass Next Image host allowlists.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={branding.siteName} className="h-8 max-w-32 object-contain" />
            ) : (
              <span>{branding.logoText}</span>
            )}
          </Link>

          {navigationLinks.length > 0 && (
            <nav className="hidden items-center space-x-4 text-sm sm:flex">
              {navigationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center space-x-1 sm:space-x-2">
            {session?.user && features.announcementsEnabled && (
              <Button
                variant="ghost"
                size="sm"
                className="relative h-10 px-2 sm:h-8"
                onClick={() => handleAnnouncementOpen(true)}
                aria-label="查看公告"
              >
                公告
                {hasUnreadAnnouncement && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Button>
            )}

            {session?.user && features.creditsEnabled && credits !== null && (
              <Link href="/credits" aria-label="查看积分历史记录">
                <Badge variant="secondary" className="h-9 whitespace-nowrap px-3 sm:h-5 sm:px-2">
                  {credits} 积分
                </Badge>
              </Link>
            )}

            {session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <span className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}>
                    {session.user.name || session.user.email}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Link href="/account">个人信息</Link>
                  </DropdownMenuItem>
                  {session.user.role === "ADMIN" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Link href={ADMIN_DASHBOARD_PATH}>管理后台</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                  登录
                </Link>
                {features.registrationEnabled && <Link href="/register" className={cn(buttonVariants({ size: "sm" }))}>注册</Link>}
              </div>
            )}

            {session?.user && (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <span
                    className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-10 sm:size-8 sm:hidden")}
                    aria-label="打开导航菜单"
                  >
                    <Menu className="size-5" />
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="mobile-menu-content w-56 p-1.5">
                  {navigationLinks.map((link) => (
                    <DropdownMenuItem key={link.href} className="mobile-menu-item min-h-11 text-base">
                      <Link
                        href={link.href}
                        className="flex min-h-11 w-full items-center"
                      >
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled className="mobile-menu-item min-h-11 text-base">
                    {session.user.name || session.user.email}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="mobile-menu-item min-h-11 text-base">
                    <Link href="/account" className="flex min-h-11 w-full items-center">
                      个人信息
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="mobile-menu-item min-h-11 text-base"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <Dialog open={announcementOpen} onOpenChange={handleAnnouncementOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>公告</DialogTitle>
          <DialogDescription className="sr-only">
            查看当前公告内容
          </DialogDescription>
          {announcement ? (
            <div className="space-y-3">
              <div className="whitespace-pre-wrap break-words leading-7">
                {renderAnnouncementContent(announcement.content)}
              </div>
              {announcement.imageUrl && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={announcement.imageUrl}
                    alt="公告图片"
                    className="mx-auto max-h-[min(56vh,520px)] max-w-full rounded-md object-contain"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                更新时间：{new Date(announcement.updatedAt).toLocaleString("zh-CN")}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无公告</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
