import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";
import {
  getLoginFailureStatus,
  recordFailedLogin,
  recordSuccessfulLogin,
} from "@/lib/login-security";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders } from "@/lib/request-security";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials.email || "").trim().toLowerCase();
        const password = credentials.password as string;
        const requestHeaders = await headers();
        const ip = getClientIpFromHeaders(requestHeaders);

        if (!email || !password) return null;
        if (!rateLimit(`login:${email}`, 10, 15 * 60 * 1000).success) return null;
        const loginStatus = await getLoginFailureStatus(email);
        if (loginStatus.isLocked) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await recordFailedLogin(email, ip);
          return null;
        }
        if (user.isDisabled) {
          await recordFailedLogin(email, ip);
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          await recordFailedLogin(email, ip);
          return null;
        }

        await recordSuccessfulLogin(email);
        const loginTime = new Date();
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: loginTime, lastActiveAt: loginTime },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
