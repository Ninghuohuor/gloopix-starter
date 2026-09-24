import "dotenv/config";
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    // Opening a new SQLite URL through Prisma creates the file. This read-only
    // query leaves existing databases untouched before migrate deploy runs.
    await prisma.$queryRawUnsafe("PRAGMA user_version");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Unable to open the configured SQLite database:", error);
  process.exitCode = 1;
});
