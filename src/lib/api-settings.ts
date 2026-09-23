import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEFAULT_IMAGE_MODELS, type ImageModelConfig, type ImageQuality, type ImageResolution } from "@/lib/image-models";
import { decryptSetting, encryptSetting } from "@/lib/settings-crypto";
import { asyncTaskProtocolSchema, DEFAULT_ASYNC_TASK_PROTOCOL } from "@/lib/async-task-protocol";

export const providerTypeIds = ["OPENAI_COMPATIBLE", "GOOGLE_GEMINI", "ASYNC_TASK_COMPATIBLE"] as const;
export type ImageProviderType = (typeof providerTypeIds)[number];

const costSchema = z.object({ low: z.number().int().min(0).max(1_000_000), medium: z.number().int().min(0).max(1_000_000), high: z.number().int().min(0).max(1_000_000) });
export const configurableImageModelSchema = z.object({
  id: z.string().trim().min(1, "模型 ID 不能为空").max(200),
  name: z.string().trim().min(1, "模型名称不能为空").max(100),
  enabled: z.boolean().default(true),
  supportsQuality: z.boolean().default(false),
  supportsResolution: z.boolean().default(true),
  defaultQuality: z.enum(["low", "medium", "high"]).default("low"),
  defaultResolution: z.enum(["1k", "2k", "4k"]).default("1k"),
  supportedResolutions: z.array(z.enum(["1k", "2k", "4k"])).min(1),
  creditCost: z.object({ "1k": costSchema, "2k": costSchema, "4k": costSchema }),
});
export const providerInputSchema = z.object({
  id: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1, "API 名称不能为空").max(80),
  type: z.enum(providerTypeIds),
  enabled: z.boolean().default(true),
  baseUrl: z.string().trim().url("请输入有效的 API Base URL").max(500),
  apiKey: z.string().max(1000).optional(),
  clearApiKey: z.boolean().optional(),
  asyncTask: asyncTaskProtocolSchema.optional(),
  models: z.array(configurableImageModelSchema).min(1, "每个 API 至少添加一个模型").max(50),
});
export const apiSettingsInputSchema = z.object({
  providers: z.array(providerInputSchema).min(1, "至少添加一个 API").max(20),
  siteName: z.string().trim().min(1, "网站名称不能为空").max(80),
  siteDescription: z.string().trim().min(1, "网站简介不能为空").max(200),
  logoText: z.string().trim().min(1, "Logo 文字不能为空").max(30),
  logoUrl: z.string().max(1000), faviconUrl: z.string().max(1000),
  browserTitle: z.string().trim().min(1, "浏览器标题不能为空").max(100),
  registrationEnabled: z.boolean(), newUserCredits: z.number().int().min(0).max(10_000_000),
  promptLibraryEnabled: z.boolean(), creditsEnabled: z.boolean(), announcementsEnabled: z.boolean(),
  defaultModel: z.string().trim().min(1, "请选择默认模型").max(400),
  defaultResolution: z.enum(["1k", "2k", "4k"]), defaultQuantity: z.number().int().min(1).max(4),
  operatorName: z.string().trim().max(100),
  contactEmail: z.union([z.string().trim().email("请输入有效的联系邮箱"), z.literal("")]),
});

export type ConfigurableImageModel = z.infer<typeof configurableImageModelSchema>;
export type ProviderInput = z.infer<typeof providerInputSchema>;
type StoredProvider = Omit<ProviderInput, "apiKey" | "clearApiKey"> & { encryptedApiKey: string | null };
export type PublicImageModel = ImageModelConfig & { providerId: string; providerName: string; providerType: ImageProviderType; upstreamModelId: string; configured: boolean };

export const DEFAULT_BRANDING = { siteName: "AI Image Starter", siteDescription: "输入描述，AI 将为你生成图片。也可以上传参考图辅助生成。", logoText: "LOGO", logoUrl: "", faviconUrl: "", browserTitle: "AI Image Starter" };
export const DEFAULT_FEATURES = { registrationEnabled: true, newUserCredits: 0, promptLibraryEnabled: true, creditsEnabled: true, announcementsEnabled: true };

function defaultModels(): ConfigurableImageModel[] {
  return DEFAULT_IMAGE_MODELS.map((model) => ({ id: model.id, name: model.name, enabled: model.enabled !== false, supportsQuality: model.supportsQuality, supportsResolution: model.supportsResolution, defaultQuality: model.defaultQuality, defaultResolution: model.defaultResolution, supportedResolutions: [...(model.supportedResolutions || ["1k", "2k", "4k"])] as ImageResolution[], creditCost: model.creditCost }));
}
function parseLegacyModels(value?: string | null) {
  if (value) try { const result = z.array(configurableImageModelSchema).safeParse(JSON.parse(value)); if (result.success && result.data.length) return result.data; } catch {}
  return defaultModels();
}
function environmentProvider(): StoredProvider {
  const mode = process.env.IMAGE_PROVIDER?.toLowerCase();
  const legacyAsync = mode === "apimart";
  const genericAsync = mode === "async";
  const apiKey = legacyAsync ? process.env.APIMART_API_KEY || "" : genericAsync ? process.env.ASYNC_API_KEY || "" : process.env.OPENAI_API_KEY || "";
  const baseUrl = legacyAsync ? process.env.APIMART_BASE_URL || "https://api.apimart.ai/v1" : genericAsync ? process.env.ASYNC_BASE_URL || "" : process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  return { id: "api-1", name: "API 1", type: legacyAsync || genericAsync ? "ASYNC_TASK_COMPATIBLE" : "OPENAI_COMPATIBLE", enabled: true, baseUrl, encryptedApiKey: apiKey ? encryptSetting(apiKey) : null, asyncTask: genericAsync ? { ...DEFAULT_ASYNC_TASK_PROTOCOL } : undefined, models: defaultModels() };
}
function parseStoredProviders(value: string | null | undefined, legacy?: { provider: string; baseUrl: string; encryptedApiKey: string | null; modelsJson: string } | null): StoredProvider[] {
  if (value) try { const parsed = JSON.parse(value) as StoredProvider[]; if (Array.isArray(parsed) && parsed.length) return parsed; } catch {}
  if (legacy) return [{ id: "api-1", name: "API 1", type: legacy.provider === "APIMART" ? "ASYNC_TASK_COMPATIBLE" : "OPENAI_COMPATIBLE", enabled: true, baseUrl: legacy.baseUrl, encryptedApiKey: legacy.encryptedApiKey, models: parseLegacyModels(legacy.modelsJson) }];
  return [environmentProvider()];
}
function flattenPublicModels(providers: StoredProvider[]): PublicImageModel[] {
  return providers.flatMap((provider) => provider.enabled ? provider.models.filter((model) => model.enabled).map((model) => ({ ...model, id: `${provider.id}::${model.id}`, upstreamModelId: model.id, providerId: provider.id, providerName: provider.name, providerType: provider.type, configured: Boolean(provider.encryptedApiKey) })) : []);
}

export async function getApiSettingsRecord() { return prisma.apiSettings.findUnique({ where: { id: "default" } }); }
export async function getPublicAppConfig() {
  const record = await getApiSettingsRecord(); const providers = parseStoredProviders(record?.providersJson, record); const models = flattenPublicModels(providers);
  const defaultModel = models.some((model) => model.id === record?.defaultModel) ? record!.defaultModel! : models[0]?.id || "";
  return {
    hasApiKey: providers.some((provider) => Boolean(provider.encryptedApiKey)), models,
    branding: { siteName: record?.siteName || DEFAULT_BRANDING.siteName, siteDescription: record?.siteDescription || DEFAULT_BRANDING.siteDescription, logoText: record?.logoText || DEFAULT_BRANDING.logoText, logoUrl: record?.logoUrl || "", faviconUrl: record?.faviconUrl || "", browserTitle: record?.browserTitle || DEFAULT_BRANDING.browserTitle },
    features: { registrationEnabled: record?.registrationEnabled ?? true, newUserCredits: record?.newUserCredits ?? 0, promptLibraryEnabled: record?.promptLibraryEnabled ?? true, creditsEnabled: record?.creditsEnabled ?? true, announcementsEnabled: record?.announcementsEnabled ?? true },
    generationDefaults: { defaultModel, defaultResolution: (record?.defaultResolution || "1k") as ImageResolution, defaultQuantity: record?.defaultQuantity || 1 },
    legal: { operatorName: record?.operatorName || "", contactEmail: record?.contactEmail || "" },
  };
}
export async function getAdminApiSettings() {
  const record = await getApiSettingsRecord(); const publicConfig = await getPublicAppConfig(); const providers = parseStoredProviders(record?.providersJson, record);
  return { ...publicConfig, providers: providers.map(({ encryptedApiKey, ...provider }) => ({ ...provider, hasApiKey: Boolean(encryptedApiKey) })) };
}
export async function getRuntimeApiSettings() {
  const record = await getApiSettingsRecord(); const publicConfig = await getPublicAppConfig();
  const providers = parseStoredProviders(record?.providersJson, record).map((provider) => ({ ...provider, apiKey: provider.encryptedApiKey ? decryptSetting(provider.encryptedApiKey) : "" }));
  return { ...publicConfig, providers };
}
export async function saveApiSettings(input: z.infer<typeof apiSettingsInputSchema>) {
  const current = await getApiSettingsRecord(); const stored = parseStoredProviders(current?.providersJson, current); const currentById = new Map(stored.map((provider) => [provider.id, provider]));
  const providers: StoredProvider[] = input.providers.map(({ apiKey, clearApiKey, ...provider }) => { let encryptedApiKey = currentById.get(provider.id)?.encryptedApiKey || null; if (clearApiKey) encryptedApiKey = null; if (apiKey?.trim()) encryptedApiKey = encryptSetting(apiKey.trim()); return { ...provider, encryptedApiKey }; });
  const first = providers[0]; const data = { providersJson: JSON.stringify(providers), siteName: input.siteName, siteDescription: input.siteDescription, logoText: input.logoText, logoUrl: input.logoUrl || null, faviconUrl: input.faviconUrl || null, browserTitle: input.browserTitle, registrationEnabled: input.registrationEnabled, newUserCredits: input.newUserCredits, promptLibraryEnabled: input.promptLibraryEnabled, creditsEnabled: input.creditsEnabled, announcementsEnabled: input.announcementsEnabled, defaultModel: input.defaultModel, defaultResolution: input.defaultResolution, defaultQuantity: input.defaultQuantity, operatorName: input.operatorName, contactEmail: input.contactEmail };
  return prisma.apiSettings.upsert({ where: { id: "default" }, create: { id: "default", provider: first.type, baseUrl: first.baseUrl, encryptedApiKey: first.encryptedApiKey, modelsJson: JSON.stringify(first.models), ...data }, update: data });
}
export function getModelCreditCost(model: ImageModelConfig, resolution: ImageResolution, quality: ImageQuality, quantity: number) { return model.creditCost[resolution][quality] * quantity; }
