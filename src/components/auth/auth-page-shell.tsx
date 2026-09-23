"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useGenerationSession } from "@/components/generation/generation-session-provider";

type AuthPageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthPageShell({ title, description, children }: AuthPageShellProps) {
  const { branding } = useGenerationSession();
  const logo = branding.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={branding.logoUrl} alt={branding.siteName} className="mx-auto mb-6 h-12 max-w-48 object-contain" />
  ) : (
    <p className="mb-6 text-3xl font-bold tracking-normal text-foreground">{branding.logoText}</p>
  );
  return (
    <div className="grid min-h-screen bg-background md:grid-cols-2">
      <section className="auth-visual-image relative hidden overflow-hidden border-r bg-muted md:block">
        <Image
          src="/assets/login-register-visual.png"
          alt={`${branding.siteName} 登录注册页视觉图`}
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
      </section>
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center md:hidden">
            {logo}
            <h1 className="text-3xl font-semibold tracking-normal">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="hidden text-center md:mb-8 md:block">
            {logo}
            <h2 className="text-2xl font-semibold tracking-normal">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
