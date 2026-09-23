import { requireAdmin } from "@/lib/admin-guard";
import {
  apiSettingsInputSchema,
  getAdminApiSettings,
  saveApiSettings,
} from "@/lib/api-settings";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  return NextResponse.json(await getAdminApiSettings());
}

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = apiSettingsInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "设置内容无效" }, { status: 400 });
  }

  const enabledModels = parsed.data.providers.flatMap((provider) => provider.enabled ? provider.models.filter((model) => model.enabled).map((model) => `${provider.id}::${model.id}`) : []);
  if (enabledModels.length === 0) {
    return NextResponse.json({ error: "至少启用一个模型" }, { status: 400 });
  }
  if (!enabledModels.includes(parsed.data.defaultModel)) {
    return NextResponse.json({ error: "默认模型必须来自已启用的 API 和模型" }, { status: 400 });
  }
  for (const provider of parsed.data.providers) {
    const uniqueIds = new Set(provider.models.map((model) => model.id));
    if (uniqueIds.size !== provider.models.length) {
      return NextResponse.json({ error: `API「${provider.name}」中的模型 ID 不能重复` }, { status: 400 });
    }
  }

  await saveApiSettings(parsed.data);
  return NextResponse.json({ success: true, settings: await getAdminApiSettings() });
}
