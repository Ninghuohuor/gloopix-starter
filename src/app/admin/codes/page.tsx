"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface RedemptionCode {
  id: string;
  code: string;
  credits: number;
  source: string;
  isActive: boolean;
  usedById: string | null;
  usedAt: string | null;
  createdAt: string;
  usedBy: { email: string; name: string | null } | null;
}

type CodeStatusFilter = "ALL" | "AVAILABLE" | "USED" | "INACTIVE";
type CodeSourceFilter = "ALL" | "MANUAL";

interface CodeFilters {
  search: string;
  statusFilter: CodeStatusFilter;
  sourceFilter: CodeSourceFilter;
  createdFrom: string;
  createdTo: string;
}

function getSourceLabel() {
  return "手动";
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<RedemptionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CodeStatusFilter>("ALL");
  const [sourceFilter, setSourceFilter] = useState<CodeSourceFilter>("ALL");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [createCount, setCreateCount] = useState(1);
  const [createCredits, setCreateCredits] = useState(100);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [revealedCodes, setRevealedCodes] = useState<Set<string>>(new Set());
  const searchRef = useRef("");
  const debounceRef = useRef<NodeJS.Timeout>(null);

  const fetchCodes = useCallback((filters: CodeFilters) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (filters.search) params.set("search", filters.search);
    if (filters.statusFilter !== "ALL") params.set("status", filters.statusFilter);
    if (filters.sourceFilter !== "ALL") params.set("source", filters.sourceFilter);
    if (filters.createdFrom) params.set("createdFrom", filters.createdFrom);
    if (filters.createdTo) params.set("createdTo", filters.createdTo);
    fetch(`/api/admin/codes?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setCodes(d.codes);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  const getCurrentFilters = useCallback((searchQuery = searchRef.current): CodeFilters => ({
    search: searchQuery,
    statusFilter,
    sourceFilter,
    createdFrom,
    createdTo,
  }), [createdFrom, createdTo, sourceFilter, statusFilter]);

  useEffect(() => {
    fetchCodes(getCurrentFilters());
  }, [createdFrom, createdTo, fetchCodes, getCurrentFilters, sourceFilter, statusFilter]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCodes(getCurrentFilters(value));
    }, 300);
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setSourceFilter("ALL");
    setCreatedFrom("");
    setCreatedTo("");
    fetchCodes({
      search: "",
      statusFilter: "ALL",
      sourceFilter: "ALL",
      createdFrom: "",
      createdTo: "",
    });
  }

  async function handleCreate() {
    setCreating(true);
    const res = await fetch("/api/admin/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: createCount, credits: createCredits, source: "MANUAL" }),
    });

    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      toast.error(data.error || "创建失败");
      return;
    }

    toast.success(`成功创建 ${data.codes.length} 个兑换码`);
    setDialogOpen(false);
    fetchCodes(getCurrentFilters());
  }

  async function handleInvalidate(id: string) {
    const res = await fetch(`/api/admin/codes/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("已作废");
      fetchCodes(getCurrentFilters());
    } else {
      toast.error("操作失败");
    }
  }

  function maskCode(code: string) {
    return code.slice(0, 4) + "****" + code.slice(-4);
  }

  function toggleReveal(id: string) {
    setRevealedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success("已复制到剪贴板");
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">兑换码管理</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <span className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
              创建兑换码
            </span>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>批量创建兑换码</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>数量</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={createCount}
                  onChange={(e) => setCreateCount(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label>每个兑换码积分数</Label>
                <Input
                  type="number"
                  min={1}
                  max={100000}
                  value={createCredits}
                  onChange={(e) => setCreateCredits(parseInt(e.target.value) || 1)}
                />
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? "创建中..." : `创建 ${createCount} 个兑换码`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="mb-4 grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1.2fr)_minmax(9rem,0.8fr)_minmax(9rem,0.8fr)_minmax(10rem,0.8fr)_minmax(10rem,0.8fr)_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="code-search">兑换码</Label>
          <Input
            id="code-search"
            placeholder="搜索兑换码..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="code-status-filter">状态</Label>
          <select
            id="code-status-filter"
            aria-label="状态筛选"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CodeStatusFilter)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="ALL">全部状态</option>
            <option value="AVAILABLE">可用</option>
            <option value="USED">已使用</option>
            <option value="INACTIVE">已作废</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="code-source-filter">来源</Label>
          <select
            id="code-source-filter"
            aria-label="来源筛选"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as CodeSourceFilter)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="ALL">全部来源</option>
            <option value="MANUAL">手动</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="code-created-from">创建时间从</Label>
          <Input
            id="code-created-from"
            aria-label="创建开始日期"
            type="date"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="code-created-to">创建时间到</Label>
          <Input
            id="code-created-to"
            aria-label="创建结束日期"
            type="date"
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={resetFilters} className="h-10 w-full">
            重置
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">加载中...</div>
          ) : codes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {search || statusFilter !== "ALL" || sourceFilter !== "ALL" || createdFrom || createdTo
                ? "未找到匹配的兑换码"
                : "暂无兑换码"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>兑换码</TableHead>
                  <TableHead>积分</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>使用者</TableHead>
                  <TableHead>兑换时间</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        <span>
                          {revealedCodes.has(code.id) ? code.code : maskCode(code.code)}
                        </span>
                        <button
                          onClick={() => toggleReveal(code.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <EyeIcon open={revealedCodes.has(code.id)} />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>{code.credits}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getSourceLabel()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {code.usedById ? (
                        <Badge variant="secondary">已使用</Badge>
                      ) : code.isActive ? (
                        <Badge>可用</Badge>
                      ) : (
                        <Badge variant="destructive">已作废</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {code.usedBy
                        ? code.usedBy.name || code.usedBy.email
                        : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {code.usedAt ? new Date(code.usedAt).toLocaleString("zh-CN") : "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(code.createdAt).toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyCode(code.code)}
                          className="h-8"
                        >
                          复制
                        </Button>
                        {code.isActive && !code.usedById && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleInvalidate(code.id)}
                            className="h-8"
                          >
                            作废
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
