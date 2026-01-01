import { CreditCard, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingCard, QueryErrorFallback } from "@/components/ui/card-error-boundary";
import { useSubscriptions, useResetCredits } from "@/lib/queries";
import type { Account } from "@/lib/accounts-store";
import { SubscriptionPlanCard } from "./subscription-plan-card";
import { useState } from "react";

interface Props {
  account: Account;
}

export function SubscriptionsCard({ account }: Props) {
  const { data: subscriptions, isLoading, error, refetch } = useSubscriptions(account);
  const resetMutation = useResetCredits(account);
  const [resettingId, setResettingId] = useState<number | null>(null);

  if (isLoading) {
    return <LoadingCard title="订阅与额度" />;
  }

  if (error) {
    return (
      <QueryErrorFallback
        title="订阅与额度"
        error={error}
        onRetry={() => refetch()}
      />
    );
  }

  const handleReset = async (subscriptionId: number) => {
    setResettingId(subscriptionId);
    try {
      await resetMutation.mutateAsync(subscriptionId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "重置失败");
    } finally {
      setResettingId(null);
    }
  };

  // 分离活跃中和未开始的订阅
  const activeSubscriptions = subscriptions?.filter((sub) => sub.subscriptionStatus === "活跃中") ?? [];
  const pendingSubscriptions = subscriptions?.filter((sub) => sub.subscriptionStatus !== "活跃中") ?? [];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="size-4" />
          订阅与额度
        </CardTitle>
        <CardDescription>当前活跃的订阅计划及额度使用情况</CardDescription>
      </CardHeader>
      <CardContent>
        {!subscriptions || subscriptions.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">暂无订阅</p>
        ) : (
          <div className="space-y-6">
            {/* 活跃中的订阅 */}
            {activeSubscriptions.length > 0 && (
              <div className="space-y-4">
                {activeSubscriptions.map((sub) => (
                  <SubscriptionPlanCard
                    key={sub.id}
                    subscription={sub}
                    variant="detail"
                    resetting={resetMutation.isPending && resettingId === sub.id}
                    onResetCredits={handleReset}
                  />
                ))}
              </div>
            )}

            {/* 未开始的订阅 - 简化显示 */}
            {pendingSubscriptions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3" />
                  待生效订阅
                </h4>
                <div className="border rounded-lg divide-y">
                  {pendingSubscriptions.map((sub) => {
                    const creditLimit = sub.subscriptionPlan?.creditLimit ?? 0;
                    return (
                      <div key={sub.id} className="px-4 py-2 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{sub.subscriptionPlanName}</span>
                          <Badge variant="secondary">{sub.subscriptionStatus}</Badge>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          ${creditLimit} · {sub.startDate?.split(" ")[0]} ~ {sub.endDate?.split(" ")[0]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
