import { CreditCard, Loader2, RefreshCw, Zap } from 'lucide-react'
import type { Subscription } from '@gaubee/88code-sdk'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
} from '@/components/ui/alert-dialog'
import { useAutoResetSettings } from '@/lib/auto-reset-store'
import { Separator } from '@/components/ui/separator'

type SubscriptionPlanType = 'MONTHLY' | 'PAY_PER_USE'

function getPlanType(
  planType: string | undefined,
): SubscriptionPlanType | 'UNKNOWN' {
  if (planType === 'MONTHLY') return 'MONTHLY'
  if (planType === 'PAY_PER_USE') return 'PAY_PER_USE'
  return 'UNKNOWN'
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * 订阅额度进度条按“剩余”渲染：剩余越多越满
 * - 负数余额/异常 creditLimit => 视为 0%
 */
function getRemainingPercent(
  currentCredits: number,
  creditLimit: number,
): number {
  if (!Number.isFinite(currentCredits) || !Number.isFinite(creditLimit))
    return 0
  if (creditLimit <= 0) return 0
  if (currentCredits <= 0) return 0
  const remaining = clampNumber(currentCredits, 0, creditLimit)
  return (remaining / creditLimit) * 100
}

export interface SubscriptionPlanCardProps {
  subscription: Subscription
  variant?: 'compact' | 'detail'
  resetting?: boolean
  onResetCredits?: (subscriptionId: number) => void | Promise<void>
}

export function SubscriptionPlanCard({
  subscription,
  variant = 'detail',
  resetting = false,
  onResetCredits,
}: SubscriptionPlanCardProps) {
  const creditLimit = subscription.subscriptionPlan?.creditLimit ?? 0
  const currentCredits = subscription.currentCredits ?? 0
  const remainingPercent = getRemainingPercent(currentCredits, creditLimit)
  const planType = getPlanType(subscription.subscriptionPlan?.planType)
  const canReset =
    planType === 'MONTHLY' && typeof onResetCredits === 'function'

  const showFeatures = variant === 'detail'
  const showResetMeta = planType === 'MONTHLY'

  // 智能自动重置
  const {
    settings: autoResetSettings,
    isEnabled,
    setSubscriptionEnabled,
  } = useAutoResetSettings()
  const smartResetEnabled = isEnabled(subscription.id)
  const canEnableSmartReset =
    planType === 'MONTHLY' && autoResetSettings.enabled

  const handleReset = async () => {
    if (!canReset) return
    await onResetCredits(subscription.id)
  }

  const handleSmartResetToggle = (checked: boolean) => {
    setSubscriptionEnabled(subscription.id, checked)
  }

  return (
    <div
      className={
        variant === 'compact'
          ? 'bg-muted/30 rounded-lg border p-3'
          : 'rounded-lg border p-4'
      }
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 font-medium">
            <CreditCard className="text-muted-foreground size-4" />
            <span className="truncate">
              {subscription.subscriptionPlanName}
            </span>
            {subscription.subscriptionStatus === '活跃中' && (
              <Badge variant="default">活跃中</Badge>
            )}
            {planType === 'PAY_PER_USE' && (
              <Badge variant="secondary">按量付费</Badge>
            )}
            {typeof subscription.remainingDays === 'number' && (
              <Badge variant="secondary" className="text-xs">
                {subscription.remainingDays}天
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground mt-1 text-xs inline-flex flex-wrap items-center gap-1">
            <span>剩余 {subscription.remainingDays ?? 0} 天</span>
            {showResetMeta && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <span>
                  重置次数:{' '}
                  <span
                    className={
                      (subscription.resetTimes ?? 0) >= 2
                        ? 'font-medium text-green-600 dark:text-green-400'
                        : (subscription.resetTimes ?? 0) === 1
                          ? 'font-medium text-blue-600 dark:text-blue-400'
                          : ''
                    }
                  >
                    {subscription.resetTimes ?? 0}
                  </span>
                </span>
                {subscription.lastCreditReset && (
                  <>
                    <Separator orientation="vertical" className="h-3" />
                    <span>
                      上次重置:{' '}
                      {new Date(subscription.lastCreditReset).toLocaleString()}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
          {showFeatures && subscription.subscriptionPlan?.features && (
            <p className="text-muted-foreground mt-2 text-xs whitespace-pre-wrap">
              {subscription.subscriptionPlan.features}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 智能自动重置开关 */}
          {planType === 'MONTHLY' && variant === 'detail' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      id={`smart-reset-${subscription.id}`}
                      checked={smartResetEnabled}
                      onCheckedChange={handleSmartResetToggle}
                      disabled={!autoResetSettings.enabled}
                      className="data-[state=checked]:bg-amber-500"
                    />
                    <Label
                      htmlFor={`smart-reset-${subscription.id}`}
                      className={`flex cursor-pointer items-center gap-1 text-xs ${
                        !autoResetSettings.enabled
                          ? 'text-muted-foreground'
                          : ''
                      }`}
                    >
                      <Zap className="size-3" />
                      智能
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[240px]">
                  {autoResetSettings.enabled ? (
                    <p className="text-xs">
                      18:55/23:55 自动重置
                      <br />
                      18:55: 剩余≥2次时重置
                      <br />
                      23:55: 兜底重置
                    </p>
                  ) : (
                    <p className="text-xs">请先在设置中启用智能自动重置</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* 手动重置按钮 */}
          {canReset && (
            <AlertDialog>
              <AlertDialogTrigger
                className={buttonVariants({
                  size: variant === 'compact' ? 'xs' : 'sm',
                })}
                disabled={resetting}
              >
                {resetting ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <RefreshCw className="size-3" />
                )}
                <span className="ml-1">重置</span>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认重置额度？</AlertDialogTitle>
                  <AlertDialogDescription>
                    将重置 "{subscription.subscriptionPlanName}"
                    的额度到初始值。每日重置次数有限制。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>
                    确认重置
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-muted-foreground flex justify-between text-xs">
          <span>剩余: ${currentCredits.toFixed(2)}</span>
          <span>总额度: ${creditLimit}</span>
        </div>
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all"
            style={{ width: `${Math.min(remainingPercent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
