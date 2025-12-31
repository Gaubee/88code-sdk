import { Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingCard, QueryErrorFallback } from "@/components/ui/card-error-boundary";
import { useCodexFreeQuota } from "@/lib/queries";
import type { Account } from "@/lib/accounts-store";

interface Props {
  account: Account;
}

export function CodexFreeCard({ account }: Props) {
  const { data: codexFree, isLoading, error, refetch } = useCodexFreeQuota(account);

  if (isLoading) {
    return <LoadingCard title="Codex Free 额度" />;
  }

  if (error) {
    return (
      <QueryErrorFallback
        title="Codex Free 额度"
        error={error}
        onRetry={() => refetch()}
      />
    );
  }

  if (!codexFree || !codexFree.enabled) {
    return null;
  }

  // 进度条按剩余渲染：剩余越多越满
  const remainingPercent = codexFree.dailyQuota > 0
    ? (codexFree.remainingQuota / codexFree.dailyQuota) * 100
    : 0;

  return (
    <Card className="mb-6 border-purple-500/30 bg-purple-500/5">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="size-4 text-purple-500" />
          Codex Free 每日免费额度
          <Badge variant="secondary" className="ml-auto bg-purple-500/10 text-purple-600">
            {codexFree.subscriptionLevel}
          </Badge>
        </CardTitle>
        <CardDescription>Codex 每日免费额度，每天 0:00 自动重置</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>剩余: ${codexFree.remainingQuota.toFixed(2)}</span>
            <span>总额度: ${codexFree.dailyQuota}</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all"
              style={{ width: `${Math.min(remainingPercent, 100)}%` }}
            />
          </div>
          {codexFree.exceeded && (
            <p className="text-xs text-destructive">今日免费额度已用完</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
