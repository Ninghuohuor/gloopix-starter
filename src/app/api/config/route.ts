import { getPublicAppConfig } from "@/lib/api-settings";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getPublicAppConfig());
}
