import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  formatCreditTransactionTime,
  getCreditTransactionDisplay,
} from "@/lib/credit-transactions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const metadata = { title: "积分历史记录" };

const PAGE_SIZE = 12;

type CreditsPageProps = {
  searchParams?: Promise<{ page?: string }>;
};

function parsePage(value: string | undefined) {
  const page = Number(value || "1");
  if (!Number.isInteger(page) || page < 1) return 1;
  return page;
}

export default async function CreditsPage({ searchParams }: CreditsPageProps) {
  const session = await auth();
  const params = await searchParams;
  const page = parsePage(params?.page);
  const skip = (page - 1) * PAGE_SIZE;

  if (!session?.user) return null;

  const [user, transactions, total] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    }),
    prisma.creditTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.creditTransaction.count({ where: { userId: session.user.id } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const previousHref = page <= 1 ? "/credits" : "/credits?page=" + (page - 1);
  const nextHref = page >= totalPages ? "/credits?page=" + totalPages : "/credits?page=" + (page + 1);

  return (
    <div className="container mx-auto px-4 py-5 sm:py-8">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">积分历史记录</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            记录积分的充值、消耗、赠送和退款，时间精确到秒。
          </p>
        </div>
        <Badge variant="secondary" className="h-8 px-3 text-sm sm:h-7">
          当前余额：{user?.credits ?? 0} 积分
        </Badge>
      </div>

      <Card size="sm">
        <CardHeader className="shrink-0">
          <CardTitle>积分明细</CardTitle>
          <CardDescription>
            共 {total} 条记录，第 {page} / {totalPages} 页
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center text-muted-foreground">
              暂无积分记录
            </div>
          ) : (
            <Table className="min-w-[42rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>类型</TableHead>
                  <TableHead>变动</TableHead>
                  <TableHead>准确时间</TableHead>
                  <TableHead>关联 ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => {
                  const display = getCreditTransactionDisplay(transaction.type, transaction.amount);
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="py-2">{display.label}</TableCell>
                      <TableCell
                        className={
                          display.direction === "income"
                            ? "py-2 font-medium text-emerald-600 dark:text-emerald-400"
                            : "py-2 font-medium text-destructive"
                        }
                      >
                        {display.signedAmount}
                      </TableCell>
                      <TableCell className="py-2">{formatCreditTransactionTime(transaction.createdAt)}</TableCell>
                      <TableCell className="max-w-[12rem] truncate py-2 text-muted-foreground">
                        {transaction.relatedId || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {totalPages > 1 && (
          <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t px-4 py-3">
            <Link
              href={previousHref}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-10 sm:h-7", page <= 1 && "pointer-events-none opacity-50")}
              aria-disabled={page <= 1}
            >
              上一页
            </Link>
            <span className="text-sm text-muted-foreground">
              第 {page} / {totalPages} 页，共 {total} 条
            </span>
            <Link
              href={nextHref}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-10 sm:h-7", page >= totalPages && "pointer-events-none opacity-50")}
              aria-disabled={page >= totalPages}
            >
              下一页
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
