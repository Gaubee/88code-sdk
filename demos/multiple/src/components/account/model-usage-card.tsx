import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingCard, QueryErrorFallback } from "@/components/ui/card-error-boundary";
import { useModelUsage } from "@/lib/queries";
import type { Account } from "@/lib/accounts-store";

interface Props {
  account: Account;
}

export function ModelUsageCard({ account }: Props) {
  const { data: modelUsage, isLoading, error, refetch } = useModelUsage(account);

  if (isLoading) {
    return <LoadingCard title="模型用量 (30天)" />;
  }

  if (error) {
    return (
      <QueryErrorFallback
        title="模型用量 (30天)"
        error={error}
        onRetry={() => refetch()}
      />
    );
  }

  // Calculate model stats from new data structure (grouped by date with models array)
  const modelStats = new Map<string, { requests: number; cost: number; tokens: number }>();

  for (const dayData of modelUsage ?? []) {
    for (const model of dayData.models ?? []) {
      const modelName = model.model || "Unknown";
      const existing = modelStats.get(modelName) || { requests: 0, cost: 0, tokens: 0 };
      modelStats.set(modelName, {
        requests: existing.requests + (model.requests ?? 0),
        cost: existing.cost + (model.cost ?? 0),
        tokens: existing.tokens + (model.tokens ?? 0),
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="size-4" />
          模型用量 (30天)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {modelStats.size === 0 ? (
          <p className="text-muted-foreground text-center py-4">暂无用量数据</p>
        ) : (
          <ScrollArea className="max-h-64">
            <div className="space-y-2 pr-3">
              {Array.from(modelStats.entries())
                .sort((a, b) => b[1].cost - a[1].cost)
                .map(([model, stats]) => (
                  <div
                    key={model}
                    className="flex items-center justify-between p-2 border rounded text-xs"
                  >
                    <div>
                      <div className="font-medium">{model}</div>
                      <div className="text-muted-foreground">
                        {(stats.tokens ?? 0).toLocaleString()} tokens
                      </div>
                    </div>
                    <div className="text-right">
                      <div>{(stats.requests ?? 0).toLocaleString()} 请求</div>
                      <div className="text-muted-foreground">
                        ${(stats.cost ?? 0).toFixed(4)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
