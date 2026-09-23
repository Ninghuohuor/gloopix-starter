"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";

const authRoutes = ["/login", "/register", "/forgot-password", "/terms", "/privacy"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = authRoutes.includes(pathname);
  const isGenerationRoute = pathname === "/" || pathname === "/generate";

  if (isAuthRoute) {
    return <main>{children}</main>;
  }

  return (
    <>
      <Header />
      <main
        className={
          isGenerationRoute
            ? "h-[calc(100svh-3.5rem)] min-h-0 overflow-hidden md:h-[calc(100dvh-3.5rem)]"
            : "min-h-[calc(100vh-3.5rem)]"
        }
      >
        {children}
      </main>
    </>
  );
}
