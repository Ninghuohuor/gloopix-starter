"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Coins, ImageUp, Megaphone, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ConfigurableImageModel, ImageProviderType, ProviderInput } from "@/lib/api-settings";
import { DEFAULT_ASYNC_TASK_PROTOCOL, type AsyncTaskProtocol } from "@/lib/async-task-protocol";
import type { ImageQuality, ImageResolution } from "@/lib/image-models";

type AdminProvider = Omit<ProviderInput, "apiKey" | "clearApiKey"> & { hasApiKey: boolean };
type Settings = {
  providers: AdminProvider[];
  branding: { siteName: string; siteDescription: string; logoText: string; logoUrl: string; faviconUrl: string; browserTitle: string };
  features: { registrationEnabled: boolean; newUserCredits: number; promptLibraryEnabled: boolean; creditsEnabled: boolean; announcementsEnabled: boolean };
  generationDefaults: { defaultModel: string; defaultResolution: ImageResolution; defaultQuantity: number };
  legal: { operatorName: string; contactEmail: string };
};

const resolutions: ImageResolution[] = ["1k", "2k", "4k"];
const qualities: ImageQuality[] = ["low", "medium", "high"];
const providerLabels: Record<ImageProviderType, string> = {
  OPENAI_COMPATIBLE: "OpenAI Images 兼容",
  GOOGLE_GEMINI: "Google Gemini 图片生成",
  ASYNC_TASK_COMPATIBLE: "异步任务（JSON 提交与轮询）",
};

function newModel(): ConfigurableImageModel {
  const costs = { low: 10, medium: 10, high: 10 };
  return { id: "", name: "", enabled: true, supportsQuality: false, supportsResolution: true, defaultQuality: "low", defaultResolution: "1k", supportedResolutions: ["1k", "2k", "4k"], creditCost: { "1k": { ...costs }, "2k": { ...costs }, "4k": { ...costs } } };
}
function newProvider(index: number): AdminProvider {
  return { id: crypto.randomUUID(), name: `API ${index}`, type: "OPENAI_COMPATIBLE", enabled: true, baseUrl: "https://api.openai.com/v1", hasApiKey: false, models: [newModel()] };
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [clearApiKeys, setClearApiKeys] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "favicon" | null>(null);
  const [newProviderId, setNewProviderId] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const testRevision = useRef(0);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" }).then(async (response) => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "加载失败"); setSettings(data);
    }).catch((error) => toast.error(error instanceof Error ? error.message : "设置加载失败")).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!newProviderId) return;
    document.getElementById(`provider-name-${newProviderId}`)?.focus();
    setNewProviderId(null);
  }, [newProviderId]);

  const enabledModels = useMemo(() => settings?.providers.flatMap((provider) => provider.enabled ? provider.models.filter((model) => model.enabled).map((model) => ({ id: `${provider.id}::${model.id}`, name: `${provider.name} / ${model.name || model.id}` })) : []) || [], [settings]);

  function patchProvider(index: number, patch: Partial<AdminProvider>) {
    testRevision.current += 1;
    setTestResults({});
    setSettings((current) => current ? { ...current, providers: current.providers.map((provider, providerIndex) => providerIndex === index ? { ...provider, ...patch } : provider) } : current);
  }
  function patchAsyncTask(index: number, patch: Partial<AsyncTaskProtocol>) {
    if (!settings) return;
    patchProvider(index, { asyncTask: { ...DEFAULT_ASYNC_TASK_PROTOCOL, ...settings.providers[index].asyncTask, ...patch } });
  }
  function patchModel(providerIndex: number, modelIndex: number, patch: Partial<ConfigurableImageModel>) {
    if (!settings) return; const provider = settings.providers[providerIndex];
    patchProvider(providerIndex, { models: provider.models.map((model, index) => index === modelIndex ? { ...model, ...patch } : model) });
  }
  function setModelVisibility(providerIndex: number, modelIndex: number, visible: boolean) {
    if (!settings) return;
    testRevision.current += 1;
    setTestResults({});
    const providers = settings.providers.map((provider, index) => index === providerIndex
      ? { ...provider, models: provider.models.map((model, modelPosition) => modelPosition === modelIndex ? { ...model, enabled: visible } : model) }
      : provider);
    const available = providers.flatMap((provider) => provider.enabled
      ? provider.models.filter((model) => model.enabled).map((model) => `${provider.id}::${model.id}`)
      : []);
    if (available.length === 0) {
      toast.error("至少保留一个对用户显示的模型");
      return;
    }
    setSettings({
      ...settings,
      providers,
      generationDefaults: {
        ...settings.generationDefaults,
        defaultModel: available.includes(settings.generationDefaults.defaultModel) ? settings.generationDefaults.defaultModel : available[0],
      },
    });
  }
  function patchCost(providerIndex: number, modelIndex: number, resolution: ImageResolution, quality: ImageQuality, value: number, flat = false) {
    if (!settings) return; const model = settings.providers[providerIndex].models[modelIndex]; const next = Math.max(0, value || 0);
    patchModel(providerIndex, modelIndex, { creditCost: { ...model.creditCost, [resolution]: flat ? { low: next, medium: next, high: next } : { ...model.creditCost[resolution], [quality]: next } } });
  }

  function addProvider() {
    if (!settings) return;
    const provider = newProvider(settings.providers.length + 1);
    setSettings({ ...settings, providers: [...settings.providers, provider] });
    setSelectedProviderId(provider.id);
    setNewProviderId(provider.id);
  }

  function removeProvider(index: number) {
    if (!settings || settings.providers.length === 1) return;
    const providers = settings.providers.filter((_, providerIndex) => providerIndex !== index);
    setSettings({ ...settings, providers });
    setSelectedProviderId(providers[Math.min(index, providers.length - 1)].id);
  }

  async function uploadAsset(kind: "logo" | "favicon", file?: File) {
    if (!file || !settings) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("图片不能超过 2MB");
    setUploading(kind);
    try {
      const form = new FormData(); form.append("image", file); form.append("kind", kind);
      const response = await fetch("/api/admin/settings/assets", { method: "POST", body: form }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "上传失败");
      setSettings({ ...settings, branding: { ...settings.branding, [kind === "logo" ? "logoUrl" : "faviconUrl"]: data.imageUrl } });
      toast.success(kind === "logo" ? "Logo 已上传" : "网站图标已上传");
    } catch (error) { toast.error(error instanceof Error ? error.message : "上传失败"); } finally { setUploading(null); }
  }

  async function save() {
    if (!settings) return; setSaving(true);
    try {
      const response = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        providers: settings.providers.map((provider) => ({ ...provider, hasApiKey: undefined, apiKey: apiKeys[provider.id] || undefined, clearApiKey: clearApiKeys[provider.id] || false })),
        ...settings.branding, ...settings.features, ...settings.generationDefaults, ...settings.legal,
      }) });
      const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "保存失败");
      setSettings(data.settings); setApiKeys({}); setClearApiKeys({}); setTestResults({}); window.dispatchEvent(new Event("app-config-updated")); toast.success("站点设置已保存");
    } catch (error) { toast.error(error instanceof Error ? error.message : "保存失败"); } finally { setSaving(false); }
  }

  async function testModel(provider: AdminProvider, model: ConfigurableImageModel, modelIndex: number) {
    const testId = `${provider.id}:${modelIndex}`;
    if (!model.id.trim() || !model.name.trim()) return toast.error("请先填写显示名称和上游模型 ID");
    if (clearApiKeys[provider.id] || (!apiKeys[provider.id]?.trim() && !provider.hasApiKey)) return toast.error("请先输入 API Key");
    const resolution = model.supportedResolutions.includes("1k") ? "1K" : model.supportedResolutions[0]?.toUpperCase();
    if (!window.confirm(`将使用「${model.name}」实际生成一张 ${resolution} 测试图片，可能产生上游费用。测试结果不会保存到用户历史，也不扣站内积分。继续吗？`)) return;
    const revision = testRevision.current;
    setTestingModel(testId);
    setTestResults((current) => { const next = { ...current }; delete next[testId]; return next; });
    try {
      const response = await fetch("/api/admin/settings/test-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: { ...provider, models: [model], apiKey: apiKeys[provider.id]?.trim() || undefined, clearApiKey: clearApiKeys[provider.id] || false } }),
      });
      const result = await response.json().catch(() => ({}));
      if (revision === testRevision.current) setTestResults((current) => ({ ...current, [testId]: { success: response.ok, message: response.ok ? result.message : result.error || "测试失败，请检查配置" } }));
    } catch {
      if (revision === testRevision.current) setTestResults((current) => ({ ...current, [testId]: { success: false, message: "测试请求未完成，请检查网络并重试" } }));
    } finally {
      setTestingModel(null);
    }
  }

  if (loading) return <p className="py-10 text-sm text-muted-foreground">正在加载设置…</p>;
  if (!settings) return <p className="py-10 text-sm text-destructive">设置加载失败，请刷新后重试。</p>;
  const activeProviderId = settings.providers.some((provider) => provider.id === selectedProviderId)
    ? selectedProviderId
    : settings.providers[0]?.id;

  return <div className="space-y-6 pb-24">
    <div><h1 className="text-2xl font-semibold">站点设置</h1><p className="mt-1 text-sm text-muted-foreground">配置品牌、开放功能、默认生成参数和多个图片 API。</p></div>

    <Tabs defaultValue="basic" className="gap-5">
      <div className="overflow-x-auto border-b" aria-label="站点设置分类">
        <TabsList variant="line" className="h-11 min-w-max gap-1 p-0">
          <TabsTrigger value="basic" className="h-11 px-4">基础信息</TabsTrigger>
          <TabsTrigger value="features" className="h-11 px-4">功能模块</TabsTrigger>
          <TabsTrigger value="providers" className="h-11 px-4">API 与模型</TabsTrigger>
          <TabsTrigger value="generation" className="h-11 px-4">生成默认值</TabsTrigger>
          <TabsTrigger value="legal" className="h-11 px-4">协议与联系</TabsTrigger>
        </TabsList>
      </div>

    <TabsContent value="basic">
    <Card><CardHeader><CardTitle className="text-base">品牌信息</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
      <Field label="网站名称"><Input className="h-11" value={settings.branding.siteName} onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, siteName: e.target.value } })} /></Field>
      <Field label="浏览器标题"><Input className="h-11" value={settings.branding.browserTitle} onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, browserTitle: e.target.value } })} /></Field>
      <Field label="网站简介" hint="显示在首页主标题下方。"><Input className="h-11" value={settings.branding.siteDescription} onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, siteDescription: e.target.value } })} /></Field>
      <Field label="Logo 文字" hint="未上传 Logo 图片时显示。"><Input className="h-11" value={settings.branding.logoText} onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, logoText: e.target.value } })} /></Field>
      <AssetUpload label="Logo 图片" info="用于站点导航和品牌展示。推荐上传透明背景的横向图片，系统会按容器等比例缩放。" hint="PNG、JPG 或 WebP，不超过 2MB；建议透明背景、宽高比 4:1，推荐 512×128px。" value={settings.branding.logoUrl} busy={uploading === "logo"} onUpload={(file) => uploadAsset("logo", file)} onClear={() => setSettings({ ...settings, branding: { ...settings.branding, logoUrl: "" } })} />
      <AssetUpload label="标签页图标" info="显示在浏览器标签页和收藏夹中。正方形图片在不同浏览器中的兼容性最好。" hint="PNG、JPG、WebP 或 ICO，不超过 2MB；必须为正方形，推荐 128×128px。" value={settings.branding.faviconUrl} busy={uploading === "favicon"} onUpload={(file) => uploadAsset("favicon", file)} onClear={() => setSettings({ ...settings, branding: { ...settings.branding, faviconUrl: "" } })} />
    </CardContent></Card>
    </TabsContent>

    <TabsContent value="features">
    <Card><CardHeader><CardTitle className="text-base">功能模块</CardTitle><p className="text-sm text-muted-foreground">按部署需要独立开启或关闭各项用户功能。</p></CardHeader><CardContent className="space-y-3">
      <FeatureModule icon={<UserPlus className="h-5 w-5" />} title="用户注册" info="关闭后会隐藏公开注册入口并拒绝新的注册请求，现有账号仍可正常使用。" description="关闭后隐藏注册入口并拒绝新用户注册；现有账号不受影响。" checked={settings.features.registrationEnabled} onChange={(value) => setSettings({ ...settings, features: { ...settings.features, registrationEnabled: value } })}>
        {settings.features.registrationEnabled && <div className="border-t pt-4"><div className="max-w-sm"><Field label="新用户初始积分" info="每个新账号注册成功后自动获得的积分数量；设为 0 表示不赠送。" hint={settings.features.creditsEnabled ? "注册成功后自动发放。" : "积分模块已关闭，此项暂不生效。"}><Input className="h-11" type="number" min={0} disabled={!settings.features.creditsEnabled} value={settings.features.newUserCredits} onChange={(e) => setSettings({ ...settings, features: { ...settings.features, newUserCredits: Number(e.target.value) } })} /></Field></div></div>}
      </FeatureModule>
      <FeatureModule icon={<BookOpen className="h-5 w-5" />} title="提示词库" info="关闭后导航和公开页面不再显示提示词库，但已有提示词数据不会删除。" description="关闭后隐藏提示词入口和公开案例；已有数据不会删除。" checked={settings.features.promptLibraryEnabled} onChange={(value) => setSettings({ ...settings, features: { ...settings.features, promptLibraryEnabled: value } })} />
      <FeatureModule icon={<Coins className="h-5 w-5" />} title="积分与兑换码" info="关闭后不再扣减或展示积分，并隐藏兑换码入口；用户生成图片时不受余额限制。" description="关闭后生成不扣积分，并隐藏余额和兑换码入口。" checked={settings.features.creditsEnabled} onChange={(value) => setSettings({ ...settings, features: { ...settings.features, creditsEnabled: value } })} />
      <FeatureModule icon={<Megaphone className="h-5 w-5" />} title="站内公告" info="关闭后用户看不到公告入口和当前公告，已发布的公告内容不会删除。" description="关闭后隐藏公告入口和当前公告；已有公告不会删除。" checked={settings.features.announcementsEnabled} onChange={(value) => setSettings({ ...settings, features: { ...settings.features, announcementsEnabled: value } })} />
    </CardContent></Card>
    </TabsContent>

    <TabsContent value="generation">
    <Card><CardHeader><CardTitle className="text-base">默认生成参数</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-3">
      <Field label="默认模型" info="用户打开生成页面时预先选中的模型，只能从已启用的 API 和模型中选择。"><select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={settings.generationDefaults.defaultModel} onChange={(e) => setSettings({ ...settings, generationDefaults: { ...settings.generationDefaults, defaultModel: e.target.value } })}>{enabledModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></Field>
      <Field label="默认分辨率" info="用户首次进入生成页面时预选的输出分辨率，实际可用范围仍由所选模型决定。"><select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={settings.generationDefaults.defaultResolution} onChange={(e) => setSettings({ ...settings, generationDefaults: { ...settings.generationDefaults, defaultResolution: e.target.value as ImageResolution } })}>{resolutions.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}</select></Field>
      <Field label="默认生成数量" info="用户首次进入生成页面时预选的单次出图数量；数量越多，通常消耗的积分和等待时间越多。"><select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={settings.generationDefaults.defaultQuantity} onChange={(e) => setSettings({ ...settings, generationDefaults: { ...settings.generationDefaults, defaultQuantity: Number(e.target.value) } })}>{[1,2,3,4].map((item) => <option key={item} value={item}>{item} 张</option>)}</select></Field>
    </CardContent></Card>
    </TabsContent>

    <TabsContent value="providers">
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">图片 API</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">先选择一个 API，再编辑它的连接和模型。密钥加密保存且不会回显。</p>
        </div>
        <Button type="button" variant="outline" className="h-11 shrink-0" onClick={addProvider}>
          <Plus className="mr-2 h-4 w-4" />添加 API
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <nav aria-label="API 列表" className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          {settings.providers.map((provider, providerIndex) => {
            const selected = provider.id === activeProviderId;
            const hasKey = Boolean(apiKeys[provider.id]?.trim()) || (provider.hasApiKey && !clearApiKeys[provider.id]);
            return <button
              key={provider.id}
              type="button"
              aria-pressed={selected}
              aria-controls={selected ? `provider-editor-${provider.id}` : undefined}
              onClick={() => setSelectedProviderId(provider.id)}
              className={`min-h-20 min-w-0 rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-primary/70 bg-primary/10" : "border-border bg-background hover:border-foreground/30 hover:bg-muted/30"}`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{String(providerIndex + 1).padStart(2, "0")}</span>
                  <span className="truncate text-sm font-semibold" title={provider.name.trim() || `未命名 API ${providerIndex + 1}`}>{provider.name.trim() || `未命名 API ${providerIndex + 1}`}</span>
                </span>
                <span className={`shrink-0 text-xs ${provider.enabled ? "text-foreground" : "text-muted-foreground"}`}>{provider.enabled ? "已启用" : "已关闭"}</span>
              </span>
              <span className="mt-1.5 block truncate pl-[1.9rem] text-xs text-muted-foreground">{providerLabels[provider.type]} · {provider.models.length} 个模型 · {hasKey ? "密钥已配置" : "密钥待配置"}</span>
            </button>;
          })}
        </nav>

        {settings.providers.map((provider, providerIndex) => provider.id === activeProviderId && (
          <section key={provider.id} id={`provider-editor-${provider.id}`} aria-labelledby={`provider-heading-${provider.id}`} className="overflow-hidden rounded-xl border border-foreground/20 bg-background shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/15 bg-muted/40 px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-lg border bg-background px-2 text-xs font-semibold tabular-nums">{String(providerIndex + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <h3 id={`provider-heading-${provider.id}`} className="truncate text-base font-semibold">{provider.name.trim() || `未命名 API ${providerIndex + 1}`}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{providerLabels[provider.type]} · {provider.models.length} 个模型</p>
                </div>
              </div>
              <div className="flex min-h-11 items-center gap-3">
                <span className="text-sm font-medium">启用此 API</span>
                <Switch label={`${provider.name.trim() || `API ${providerIndex + 1}`}：启用此 API`} checked={provider.enabled} onCheckedChange={(value) => patchProvider(providerIndex, { enabled: value })} />
              </div>
            </header>

            <div className="space-y-6 p-4 sm:p-5">
              <div>
                <h4 className="mb-4 text-sm font-semibold">连接配置</h4>
                <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                  <Field label="API 名称" htmlFor={`provider-name-${provider.id}`}><Input id={`provider-name-${provider.id}`} className="h-11" value={provider.name} onChange={(e) => patchProvider(providerIndex, { name: e.target.value })} /></Field>
                  <Field label="接口类型" info="OpenAI Images 兼容中转站请选择第一项。异步任务适用于 JSON 提交、按任务 ID 轮询的接口，需要按服务商文档配置路径与响应字段。"><select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={provider.type} onChange={(e) => { const type = e.target.value as ImageProviderType; patchProvider(providerIndex, { type, asyncTask: type === "ASYNC_TASK_COMPATIBLE" ? provider.asyncTask || { ...DEFAULT_ASYNC_TASK_PROTOCOL } : provider.asyncTask }); }}>{Object.entries(providerLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field>
                  <Field label="API Base URL" info="上游接口的根地址，通常需要包含版本路径，例如 https://api.openai.com/v1。" hint="填写接口根地址和版本路径。"><Input className="h-11" type="url" value={provider.baseUrl} onChange={(e) => patchProvider(providerIndex, { baseUrl: e.target.value })} /></Field>
                  <Field label="API Key" hint={provider.hasApiKey ? "已配置；留空保持不变。" : "尚未配置。"}><Input className="h-11" type="password" autoComplete="new-password" placeholder={provider.hasApiKey ? "留空以保留当前密钥" : "输入 API Key"} value={apiKeys[provider.id] || ""} onChange={(e) => { testRevision.current += 1; setTestResults({}); setApiKeys({ ...apiKeys, [provider.id]: e.target.value }); setClearApiKeys({ ...clearApiKeys, [provider.id]: false }); }} /></Field>
                </div>
                {provider.hasApiKey && <label className="mt-2 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={clearApiKeys[provider.id] || false} onChange={(e) => { testRevision.current += 1; setTestResults({}); setClearApiKeys({ ...clearApiKeys, [provider.id]: e.target.checked }); }} />清除已保存的 API Key</label>}
              </div>

              {provider.type === "ASYNC_TASK_COMPATIBLE" && <div className="rounded-lg border bg-muted/15 p-4">
                <h4 className="text-sm font-semibold">异步任务协议</h4>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">适用于 Bearer Key、JSON 提交和 GET 轮询的接口。字段名称及路径按服务商文档填写；不保证兼容所有异步接口。</p>
                {!provider.asyncTask ? <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border bg-background p-3"><span className="text-sm text-muted-foreground">此 API 沿用旧版兼容实现，保存时不会自动更改。</span><Button type="button" variant="outline" onClick={() => patchProvider(providerIndex, { asyncTask: { ...DEFAULT_ASYNC_TASK_PROTOCOL } })}>改用可配置协议</Button></div> : <>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="提交路径" hint="POST，请填写相对于 Base URL 的路径。"><Input className="h-11" value={provider.asyncTask.submitPath} onChange={(e) => patchAsyncTask(providerIndex, { submitPath: e.target.value })} /></Field>
                    <Field label="轮询路径" hint="GET，必须包含 {taskId}。"><Input className="h-11" value={provider.asyncTask.taskPath} onChange={(e) => patchAsyncTask(providerIndex, { taskPath: e.target.value })} /></Field>
                    <Field label="任务 ID 字段" hint="留空自动识别常见字段；例：data.task_id。"><Input className="h-11" placeholder="自动识别" value={provider.asyncTask.taskIdPath} onChange={(e) => patchAsyncTask(providerIndex, { taskIdPath: e.target.value })} /></Field>
                    <Field label="结果图片字段" hint="留空自动识别常见字段；例：data.images.0.url。"><Input className="h-11" placeholder="自动识别" value={provider.asyncTask.resultPath} onChange={(e) => patchAsyncTask(providerIndex, { resultPath: e.target.value })} /></Field>
                  </div>
                  <details className="mt-4 border-t pt-4"><summary className="cursor-pointer text-sm font-medium">更多协议字段与参考图上传</summary><div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {([
                      ["uploadPath", "参考图上传路径", "留空则传图片 data URL；上传使用 multipart/form-data。"],
                      ["uploadField", "上传文件字段", "multipart 文件字段名。"],
                      ["uploadUrlPath", "上传结果地址字段", "留空自动识别。"],
                      ["referenceField", "生成请求参考图字段", "生成请求中图片地址数组的字段名。"],
                      ["statusPath", "任务状态字段", "留空自动识别；例：data.status。"],
                      ["successStatuses", "成功状态", "英文逗号分隔。"],
                      ["failureStatuses", "失败状态", "英文逗号分隔。"],
                    ] as const).map(([key, label, hint]) => <Field key={key} label={label} hint={hint}><Input className="h-11" value={provider.asyncTask![key]} onChange={(e) => patchAsyncTask(providerIndex, { [key]: e.target.value })} /></Field>)}
                  </div></details>
                </>}
              </div>}

              <div className="rounded-lg border bg-muted/15 p-3 sm:p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold">此 API 的模型</h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">下方模型均使用上面的连接配置；关闭“用户端显示”后不会出现在生成页，配置仍保留。测试模型连接会真实出图，可能产生上游费用。</p>
                  </div>
                  <Button type="button" variant="outline" className="h-11" onClick={() => patchProvider(providerIndex, { models: [...provider.models, newModel()] })}><Plus className="mr-1 h-4 w-4" />添加模型</Button>
                </div>
                <div className="space-y-4">
                  {provider.models.map((model, modelIndex) => (
                    <section key={`${modelIndex}-${model.id}`} aria-label={`模型 ${modelIndex + 1}：${model.name || "未命名"}`} className="rounded-lg border bg-card p-4 shadow-sm">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="text-xs font-medium tabular-nums text-muted-foreground">模型 {String(modelIndex + 1).padStart(2, "0")}</span>
                          <span className="min-w-0 truncate text-sm font-semibold">{model.name || "未命名模型"}</span>
                        </div>
                        <div className="flex min-h-11 flex-wrap items-center gap-3">
                          <Button type="button" variant="outline" className="h-11" disabled={Boolean(testingModel) || saving} onClick={() => testModel(provider, model, modelIndex)}>{testingModel === `${provider.id}:${modelIndex}` ? "正在测试…" : "测试模型连接"}</Button>
                          <span className="text-sm font-medium">用户端显示</span>
                          <Switch label={`${model.name || `模型 ${modelIndex + 1}`}：用户端显示`} checked={model.enabled} onCheckedChange={(value) => setModelVisibility(providerIndex, modelIndex, value)} />
                        </div>
                      </div>
                      {testResults[`${provider.id}:${modelIndex}`] && <p role={testResults[`${provider.id}:${modelIndex}`].success ? "status" : "alert"} className={`mb-3 rounded-md border px-3 py-2 text-sm ${testResults[`${provider.id}:${modelIndex}`].success ? "text-foreground" : "text-destructive"}`}>{testResults[`${provider.id}:${modelIndex}`].message}</p>}
                      <div className="grid gap-3 sm:grid-cols-2"><Field label="显示名称"><Input className="h-11" value={model.name} onChange={(e) => patchModel(providerIndex, modelIndex, { name: e.target.value })} /></Field><Field label="上游模型 ID" info="发送给上游 API 的真实模型标识，必须与服务商文档中的模型 ID 完全一致。"><Input className="h-11 font-mono text-sm" value={model.id} onChange={(e) => patchModel(providerIndex, modelIndex, { id: e.target.value })} /></Field></div>
                      <div className="mt-3 flex flex-wrap gap-x-5"><Toggle compact label="质量档位" checked={model.supportsQuality} onChange={(value) => patchModel(providerIndex, modelIndex, { supportsQuality: value })} /><Toggle compact label="分辨率参数" checked={model.supportsResolution} onChange={(value) => patchModel(providerIndex, modelIndex, { supportsResolution: value })} /></div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">{resolutions.map((resolution) => <div key={resolution} className="rounded-md border bg-background/50 p-3"><p className="mb-2 text-sm font-medium">{resolution.toUpperCase()} 积分</p>{(model.supportsQuality ? qualities : ["low" as const]).map((quality) => <label key={quality} className="mb-2 grid grid-cols-[4rem_1fr] items-center gap-2 text-xs text-muted-foreground"><span>{model.supportsQuality ? quality : "每张"}</span><Input className="h-9" type="number" min={0} value={model.creditCost[resolution][quality]} onChange={(e) => patchCost(providerIndex, modelIndex, resolution, quality, Number(e.target.value), !model.supportsQuality)} /></label>)}</div>)}</div>
                      <div className="mt-2 flex justify-end"><Button type="button" size="sm" variant="ghost" className="text-destructive" disabled={provider.models.length === 1} onClick={() => patchProvider(providerIndex, { models: provider.models.filter((_, index) => index !== modelIndex) })}><Trash2 className="mr-1 h-4 w-4" />删除模型</Button></div>
                    </section>
                  ))}
                </div>
              </div>
              <div className="flex justify-end border-t pt-2"><Button type="button" variant="ghost" className="text-destructive" disabled={settings.providers.length === 1} onClick={() => removeProvider(providerIndex)}><Trash2 className="mr-2 h-4 w-4" />删除此 API</Button></div>
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
    </TabsContent>

    <TabsContent value="legal">
    <Card><CardHeader><CardTitle className="text-base">协议与运营者信息</CardTitle></CardHeader><CardContent className="grid items-start gap-5 sm:grid-cols-2"><Field label="运营者名称" htmlFor="legal-operator-name" hint="显示在用户协议和隐私政策中。"><Input id="legal-operator-name" className="h-11" value={settings.legal.operatorName} onChange={(e) => setSettings({ ...settings, legal: { ...settings.legal, operatorName: e.target.value } })} /></Field><Field label="联系邮箱" htmlFor="legal-contact-email" hint="显示在用户协议和隐私政策中。"><Input id="legal-contact-email" className="h-11" type="email" value={settings.legal.contactEmail} onChange={(e) => setSettings({ ...settings, legal: { ...settings.legal, contactEmail: e.target.value } })} /></Field></CardContent></Card>
    </TabsContent>
    </Tabs>

    <div className="sticky bottom-4 flex justify-end rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur"><Button className="min-w-28" onClick={save} disabled={saving}>{saving ? "正在保存…" : "保存设置"}</Button></div>
  </div>;
}

function Field({ label, hint, info, htmlFor, children }: { label: string; hint?: string; info?: string; htmlFor?: string; children: React.ReactNode }) { return <div className="flex flex-col gap-1.5"><div className="flex min-h-7 items-center gap-0.5"><Label htmlFor={htmlFor}>{label}</Label>{info && <InfoTooltip content={info} label={`${label}说明`} />}</div>{children}{hint && <p className="text-xs leading-5 text-muted-foreground">{hint}</p>}</div>; }
function Toggle({ label, hint, checked, onChange, compact = false }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void; compact?: boolean }) { return <div className={`flex items-center justify-between gap-3 rounded-md ${compact ? "min-h-11 py-1" : "min-h-14 border p-3"}`}><span><span className="block text-sm font-medium">{label}</span>{hint && <span className="mt-1 block text-xs leading-5 text-muted-foreground">{hint}</span>}</span><Switch label={label} checked={checked} onCheckedChange={onChange} /></div>; }
function FeatureModule({ icon, title, info, description, checked, onChange, children }: { icon: React.ReactNode; title: string; info: string; description: string; checked: boolean; onChange: (value: boolean) => void; children?: React.ReactNode }) { return <section className="rounded-lg border bg-muted/15 p-4 sm:p-5"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">{icon}</span><div><div className="flex min-h-7 items-center gap-0.5"><h3 className="font-medium">{title}</h3><InfoTooltip content={info} label={`${title}说明`} /></div><p className="text-sm leading-6 text-muted-foreground">{description}</p></div></div><Switch label={title} checked={checked} onCheckedChange={onChange} /></div>{children && <div className="mt-4 pl-0 sm:pl-[3.25rem]">{children}</div>}</section>; }
function AssetUpload({ label, info, hint, value, busy, onUpload, onClear }: { label: string; info: string; hint: string; value: string; busy: boolean; onUpload: (file?: File) => void; onClear: () => void }) { return <div className="grid gap-1.5"><div className="flex min-h-7 items-center gap-0.5"><Label>{label}</Label><InfoTooltip content={info} label={`${label}说明`} /></div><div className="flex min-h-24 items-center gap-4 rounded-md border border-dashed p-3">{value ? <img src={value} alt={`${label}预览`} className="h-14 w-24 rounded bg-white/5 object-contain" /> : <div className="flex h-14 w-24 items-center justify-center rounded bg-muted text-xs text-muted-foreground">暂无图片</div>}<div className="flex flex-wrap gap-2"><label className="inline-flex h-11 cursor-pointer items-center rounded-md border px-3 text-sm hover:bg-muted"><ImageUp className="mr-2 h-4 w-4" />{busy ? "上传中…" : "选择图片"}<input className="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon,.ico" disabled={busy} onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ""; }} /></label>{value && <Button type="button" variant="ghost" className="h-11 text-destructive" onClick={onClear}>移除</Button>}</div></div><p className="text-xs leading-5 text-muted-foreground">{hint}</p></div>; }
