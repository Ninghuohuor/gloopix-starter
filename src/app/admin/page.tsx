import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "管理后台" };

export default async function AdminPage() {
  const [userCount, imageCount] = await Promise.all([
    prisma.user.count(),
    prisma.image.count(),
  ]);

  const totalCodes = await prisma.redemptionCode.count();
  const usedCodes = await prisma.redemptionCode.count({ where: { usedById: { not: null } } });
  const activeCodes = totalCodes - usedCodes;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">管理后台</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">总用户数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[clamp(1.5rem,8vw,1.875rem)] font-bold">{userCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">生成图片数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[clamp(1.5rem,8vw,1.875rem)] font-bold">{imageCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">可用兑换码</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[clamp(1.5rem,8vw,1.875rem)] font-bold">{activeCodes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">已使用兑换码</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[clamp(1.5rem,8vw,1.875rem)] font-bold">{usedCodes}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
