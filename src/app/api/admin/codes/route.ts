import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { generateRedemptionCode } from "@/lib/crypto";
import { createCodesSchema } from "@/lib/validations";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

function parseDateFilter(value: string | null, endOfDay = false) {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "ALL";
  const source = searchParams.get("source") || "ALL";
  const createdFrom = parseDateFilter(searchParams.get("createdFrom"));
  const createdTo = parseDateFilter(searchParams.get("createdTo"), true);
  const skip = (page - 1) * limit;

  const where: Prisma.RedemptionCodeWhereInput = {};

  if (search) where.code = { contains: search };
  if (source !== "ALL") where.source = source;
  if (createdFrom || createdTo) {
    where.createdAt = {
      ...(createdFrom ? { gte: createdFrom } : {}),
      ...(createdTo ? { lte: createdTo } : {}),
    };
  }
  if (status === "AVAILABLE") {
    where.isActive = true;
    where.usedById = null;
  } else if (status === "USED") {
    where.usedById = { not: null };
  } else if (status === "INACTIVE") {
    where.isActive = false;
  }

  const [codes, total] = await Promise.all([
    prisma.redemptionCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        usedBy: { select: { email: true, name: true } },
      },
    }),
    prisma.redemptionCode.count({ where }),
  ]);

  return NextResponse.json({ codes, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = createCodesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { count, credits, source } = parsed.data;
  const codes = [];

  for (let i = 0; i < count; i++) {
    const code = await prisma.redemptionCode.create({
      data: {
        code: generateRedemptionCode(),
        credits,
        source,
        createdById: session!.user.id,
      },
    });
    codes.push(code);
  }

  return NextResponse.json({ success: true, codes });
}
