import { CreditCard, RefreshCw, Loader2, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LoadingCard, QueryErrorFallback } from "@/components/ui/card-error-boundary";
import { useSubscriptions, useResetCredits } from "@/lib/queries";
import type { Account } from "@/lib/accounts-store";

interface Props {
  account: Account;
}

export function SubscriptionsCard({ account }: Props) {
  const { data: subscriptions, isLoading, error, refetch } = useSubscriptions(account);
  const resetMutation = useResetCredits(account);

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
    try {
      await resetMutation.mutateAsync(subscriptionId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "重置失败");
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
                {activeSubscriptions.map((sub) => {
                  const creditLimit = sub.subscriptionPlan?.creditLimit ?? 0;
                  const currentCredits = sub.currentCredits ?? 0;
                  // 进度条按剩余渲染：剩余越多越满
                  const remainingPercent = creditLimit > 0 ? (currentCredits / creditLimit) * 100 : 0;
                  const isResetting = resetMutation.isPending;

                  return (
                    <div key={sub.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {sub.subscriptionPlanName}
                            <Badge variant="default">活跃中</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            剩余 {sub.remainingDays ?? 0} 天 | 重置次数: {sub.resetTimes ?? 0}
                            {sub.lastCreditReset && (
                              <> | 上次重置: {new Date(sub.lastCreditReset).toLocaleString()}</>
                            )}
                          </p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger
                            className={buttonVariants({ size: "sm" })}
                            disabled={isResetting}
                          >
                            {isResetting ? (
                              <Loader2 className="size-4 animate-spin mr-1" />
                            ) : (
                              <RefreshCw className="size-4 mr-1" />
                            )}
                            重置额度
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认重置额度？</AlertDialogTitle>
                              <AlertDialogDescription>
                                将重置 "{sub.subscriptionPlanName}" 的额度到初始值。每日重置次数有限制。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleReset(sub.id)}>
                                确认重置
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>剩余: ${currentCredits.toFixed(2)}</span>
                          <span>总额度: ${creditLimit}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${Math.min(remainingPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
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
