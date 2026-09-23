import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { GenerationSessionProvider } from "@/components/generation/generation-session-provider";
import "./globals.css";
import { getPublicAppConfig } from "@/lib/api-settings";

const appFontFamily =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Helvetica Neue", Arial, sans-serif';

export async function generateMetadata(): Promise<Metadata> {
  const { branding } = await getPublicAppConfig();
  return {
    title: { default: branding.browserTitle, template: `%s | ${branding.siteName}` },
    description: `${branding.siteName} 图片生成服务`,
    icons: branding.faviconUrl
      ? { icon: [{ url: branding.faviconUrl }] }
      : {
          icon: [
            { url: "/favicon.ico", sizes: "any" },
            { url: "/icon.svg", type: "image/svg+xml" },
          ],
          apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
        },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className="antialiased"
        style={{ fontFamily: appFontFamily }}
      >
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            forcedTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <GenerationSessionProvider>
              <AppShell>{children}</AppShell>
              <Toaster />
            </GenerationSessionProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
