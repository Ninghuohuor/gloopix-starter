import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const credits = Number.parseInt(process.env.ADMIN_INITIAL_CREDITS || "1000", 10);

  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before running npm run seed.");
  }
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
  }
  if (!Number.isSafeInteger(credits) || credits < 0) {
    throw new Error("ADMIN_INITIAL_CREDITS must be a non-negative integer.");
  }

  const existing = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existing) {
    console.log("Admin user already exists:", existing.email);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: "管理员",
      role: "ADMIN",
      credits,
    },
  });

  console.log("Created admin user:", admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
