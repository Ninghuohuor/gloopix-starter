import type { NextAuthConfig } from "next-auth";
import { UNAUTHORIZED_ADMIN_REDIRECT_PATH } from "@/lib/route-targets";

export const authConfig: NextAuthConfig = {
  providers: [],
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdmin = auth?.user?.role === "ADMIN";
      const { pathname } = nextUrl;

      const publicRoutes = ["/", "/generate", "/prompts", "/login", "/register", "/forgot-password", "/terms", "/privacy"];
      const protectedRoutes = ["/credits", "/redeem", "/history", "/account"];
      const isPublicRoute = publicRoutes.includes(pathname);
      const isProtectedRoute = protectedRoutes.includes(pathname);

      if (isPublicRoute) return true;

      if (isProtectedRoute && !isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return Response.redirect(new URL("/login", nextUrl));
        if (!isAdmin) {
          return Response.redirect(new URL(UNAUTHORIZED_ADMIN_REDIRECT_PATH, nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) return Response.redirect(new URL("/login", nextUrl));
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id as string;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
