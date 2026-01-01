import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import type { Subscription } from "@gaubee/88code-sdk";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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

type SubscriptionPlanType = "MONTHLY" | "PAY_PER_USE";

function getPlanType(planType: string | undefined): SubscriptionPlanType | "UNKNOWN" {
  if (planType === "MONTHLY") return "MONTHLY";
  if (planType === "PAY_PER_USE") return "PAY_PER_USE";
  return "UNKNOWN";
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * 订阅额度进度条按“剩余”渲染：剩余越多越满
 * - 负数余额/异常 creditLimit => 视为 0%
 */
function getRemainingPercent(currentCredits: number, creditLimit: number): number {
  if (!Number.isFinite(currentCredits) || !Number.isFinite(creditLimit)) return 0;
  if (creditLimit <= 0) return 0;
  if (currentCredits <= 0) return 0;
  const remaining = clampNumber(currentCredits, 0, creditLimit);
  return (remaining / creditLimit) * 100;
}

export interface SubscriptionPlanCardProps {
  subscription: Subscription;
  variant?: "compact" | "detail";
  resetting?: boolean;
  onResetCredits?: (subscriptionId: number) => void | Promise<void>;
}

export function SubscriptionPlanCard({
  subscription,
  variant = "detail",
  resetting = false,
  onResetCredits,
}: SubscriptionPlanCardProps) {
  const creditLimit = subscription.subscriptionPlan?.creditLimit ?? 0;
  const currentCredits = subscription.currentCredits ?? 0;
  const remainingPercent = getRemainingPercent(currentCredits, creditLimit);
  const planType = getPlanType(subscription.subscriptionPlan?.planType);
  const canReset = planType === "MONTHLY" && typeof onResetCredits === "function";

  const showFeatures = variant === "detail";
  const showResetMeta = planType === "MONTHLY";

  const handleReset = async () => {
    if (!canReset) return;
    await onResetCredits(subscription.id);
  };

  return (
    <div
      className={
        variant === "compact"
          ? "p-3 border rounded-lg bg-muted/30"
          : "p-4 border rounded-lg"
      }
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="font-medium flex items-center gap-2 flex-wrap">
            <CreditCard className="size-4 text-muted-foreground" />
            <span className="truncate">{subscription.subscriptionPlanName}</span>
            {subscription.subscriptionStatus === "活跃中" && (
              <Badge variant="default">活跃中</Badge>
            )}
            {planType === "PAY_PER_USE" && (
              <Badge variant="secondary">按量付费</Badge>
            )}
            {typeof subscription.remainingDays === "number" && (
              <Badge variant="secondary" className="text-xs">
                {subscription.remainingDays}天
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            剩余 {subscription.remainingDays ?? 0} 天
            {showResetMeta && (
              <>
                {" "}
                | 重置次数: <span className={
                  (subscription.resetTimes ?? 0) >= 2
                    ? "text-green-600 dark:text-green-400 font-medium"
                    : (subscription.resetTimes ?? 0) === 1
                    ? "text-blue-600 dark:text-blue-400 font-medium"
                    : ""
                }>{subscription.resetTimes ?? 0}</span>
                {subscription.lastCreditReset && (
                  <> | 上次重置: {new Date(subscription.lastCreditReset).toLocaleString()}</>
                )}
              </>
            )}
          </p>
          {showFeatures && subscription.subscriptionPlan?.features && (
            <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
              {subscription.subscriptionPlan.features}
            </p>
          )}
        </div>

        {canReset && (
          <AlertDialog>
            <AlertDialogTrigger
              className={buttonVariants({
                size: variant === "compact" ? "xs" : "sm",
              })}
              disabled={resetting}
            >
              {resetting ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCw className="size-3" />
              )}
              <span className="ml-1">重置额度</span>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认重置额度？</AlertDialogTitle>
                <AlertDialogDescription>
                  将重置 "{subscription.subscriptionPlanName}" 的额度到初始值。每日重置次数有限制。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>确认重置</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
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
}

