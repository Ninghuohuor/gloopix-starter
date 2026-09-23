"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type AdminNavItem = {
  href: string;
  label: string;
};

export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    items.forEach((item) => router.prefetch(item.href));
  }, [items, router]);

  function isItemActive(href: string) {
    if (href === "/admin") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:hidden" aria-label="管理后台导航">
        {items.map((item) => {
          const isActive = isItemActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onMouseEnter={() => router.prefetch(item.href)}
              onFocus={() => router.prefetch(item.href)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted",
                isActive && "border-primary/50 bg-muted text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <aside className="hidden w-48 shrink-0 sm:block">
        <nav className="space-y-1" aria-label="管理后台导航">
          {items.map((item) => {
            const isActive = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onMouseEnter={() => router.prefetch(item.href)}
                onFocus={() => router.prefetch(item.href)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
                  isActive && "bg-muted text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
