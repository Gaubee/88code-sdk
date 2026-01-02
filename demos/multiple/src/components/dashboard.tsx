import * as React from 'react'
import type {
  CodexFreeQuota,
  RelayPulseStatusEntry,
  Subscription,
} from '@gaubee/88code-sdk'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  ChevronRight,
  RefreshCw,
  Settings,
  User,
  Wallet,
  Zap,
} from 'lucide-react'
import { SubscriptionPlanCard } from '@/components/account/subscription-plan-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { Account } from '@/lib/accounts-store'
import {
  queryKeys,
  useCodexFreeQuota,
  useLoginInfo,
  useResetCredits,
  useSubscriptions,
} from '@/lib/queries'
import { useRelayPulseStatus } from '@/lib/relaypulse-queries'
import {
  computeRelayPulseAvailabilityPercent,
  formatRelayPulseTimestampSeconds,
  getRelayPulseStatusLabel,
} from '@/lib/relaypulse-utils'
import { useAccounts } from '@/lib/use-sdk'
import { useRelayPulseSettings } from '@/lib/service-context'
import { relayPulseQueryKeys } from '@/lib/relaypulse-queries'

type DashboardTotals = {
  totalCredits: number
  remainingCredits: number
  usedCredits: number
  activeSubscriptions: number
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, value)
}

function isActiveSubscription(subscription: Subscription): boolean {
  return subscription.subscriptionStatus === '活跃中'
}

function useDashboardTotals(accounts: Account[]): DashboardTotals {
  const queryClient = useQueryClient()

  // 缓存上一次的结果，避免 useSyncExternalStore 因新对象引用触发无限循环
  const cachedRef = React.useRef<DashboardTotals>({
    totalCredits: 0,
    remainingCredits: 0,
    usedCredits: 0,
    activeSubscriptions: 0,
  })

  const getSnapshot = React.useCallback((): DashboardTotals => {
    const totals: DashboardTotals = {
      totalCredits: 0,
      remainingCredits: 0,
      usedCredits: 0,
      activeSubscriptions: 0,
    }

    for (const account of accounts) {
      const subs = queryClient.getQueryData<Subscription[]>(
        queryKeys.subscriptions(account.id),
      )
      const codexFree = queryClient.getQueryData<CodexFreeQuota>(
        queryKeys.codexFreeQuota(account.id),
      )

      for (const sub of (subs ?? []).filter(isActiveSubscription)) {
        totals.totalCredits += clampNonNegative(
          sub.subscriptionPlan?.creditLimit ?? 0,
        )
        totals.remainingCredits += clampNonNegative(sub.currentCredits ?? 0)
        totals.activeSubscriptions += 1
      }

      if (codexFree?.enabled) {
        totals.totalCredits += clampNonNegative(codexFree.dailyQuota)
        totals.remainingCredits += clampNonNegative(codexFree.remainingQuota)
        totals.activeSubscriptions += 1
      }
    }

    totals.usedCredits = totals.totalCredits - totals.remainingCredits

    // 只有值真正变化时才返回新对象
    const cached = cachedRef.current
    if (
      cached.totalCredits === totals.totalCredits &&
      cached.remainingCredits === totals.remainingCredits &&
      cached.usedCredits === totals.usedCredits &&
      cached.activeSubscriptions === totals.activeSubscriptions
    ) {
      return cached
    }

    cachedRef.current = totals
    return totals
  }, [accounts, queryClient])

  return React.useSyncExternalStore(
    React.useCallback(
      (onStoreChange) => queryClient.getQueryCache().subscribe(onStoreChange),
      [queryClient],
    ),
    getSnapshot,
    () => cachedRef.current,
  )
}

function CodexFreeSummary({ quota }: { quota: CodexFreeQuota }) {
  const remainingPercent =
    quota.dailyQuota > 0 ? (quota.remainingQuota / quota.dailyQuota) * 100 : 0

  return (
    <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Zap className="size-4 text-purple-500" />
        <span className="text-sm font-medium">Codex Free 每日免费额度</span>
        <Badge
          variant="secondary"
          className="bg-purple-500/10 text-xs text-purple-600"
        >
          {quota.subscriptionLevel}
        </Badge>
      </div>
      <div className="space-y-1">
        <div className="text-muted-foreground flex justify-between text-xs">
          <span>剩余: ${quota.remainingQuota.toFixed(2)}</span>
          <span>总额度: ${quota.dailyQuota}</span>
        </div>
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div
            className="h-full bg-purple-500 transition-all"
            style={{ width: `${Math.min(remainingPercent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function AccountSummaryCard({ account }: { account: Account }) {
  const { data: loginInfo } = useLoginInfo(account)
  const subsQuery = useSubscriptions(account)
  const codexFreeQuery = useCodexFreeQuota(account)
  const resetMutation = useResetCredits(account)
  const [resettingId, setResettingId] = React.useState<number | null>(null)

  const activeSubscriptions = subsQuery.data?.filter(isActiveSubscription) ?? []
  const hasCodexFree = !!codexFreeQuery.data?.enabled

  const handleReset = async (subscriptionId: number) => {
    setResettingId(subscriptionId)
    try {
      await resetMutation.mutateAsync(subscriptionId)
    } finally {
      setResettingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <User className="text-muted-foreground size-5" />
            <div className="min-w-0">
              <CardTitle className="truncate text-base">
                {account.name}
              </CardTitle>
              {loginInfo && (
                <CardDescription className="truncate">
                  {loginInfo.actualName} ({loginInfo.email})
                </CardDescription>
              )}
            </div>
          </div>
          <Link to="/account/$accountId" params={{ accountId: account.id }}>
            <Button variant="ghost" size="sm">
              详情
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {subsQuery.isLoading && !subsQuery.data ? (
          <p className="text-muted-foreground py-4 text-center text-xs">
            加载中...
          </p>
        ) : subsQuery.error ? (
          <p className="text-destructive py-4 text-center text-xs">
            {subsQuery.error.message}
          </p>
        ) : activeSubscriptions.length === 0 && !hasCodexFree ? (
          <p className="text-muted-foreground py-2 text-center text-sm">
            暂无活跃订阅
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {hasCodexFree && codexFreeQuery.data && (
              <CodexFreeSummary quota={codexFreeQuery.data} />
            )}
            {activeSubscriptions.map((sub) => (
              <SubscriptionPlanCard
                key={sub.id}
                subscription={sub}
                variant="compact"
                resetting={resetMutation.isPending && resettingId === sub.id}
                onResetCredits={handleReset}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusTrend({ entry }: { entry: RelayPulseStatusEntry }) {
  const timeline = entry.timeline ?? []
  if (timeline.length === 0) return null

  return (
    <div className="flex items-center gap-0.5">
      {timeline.map((point) => {
        const status = getRelayPulseStatusLabel(point.status)
        return (
          <div
            key={point.timestamp}
            title={`${point.time} · ${status.text} · ${point.latency}ms`}
            className={'h-3 w-1.5 rounded-none ' + status.className}
          />
        )
      })}
    </div>
  )
}

function RelayPulseServiceSection({
  title,
  entries,
  isLoading,
  error,
}: {
  title: string
  entries: RelayPulseStatusEntry[]
  isLoading: boolean
  error: Error | null
}) {
  const items = React.useMemo(() => {
    return entries.slice().sort((a, b) => a.channel.localeCompare(b.channel))
  }, [entries])

  return (
    <div className="space-y-2">
      <h4 className="text-muted-foreground text-sm font-medium">{title}</h4>
      {error ? (
        <p className="text-destructive text-sm">{error.message}</p>
      ) : isLoading && items.length === 0 ? (
        <p className="text-muted-foreground text-sm">加载中...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">暂无数据</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>当前状态</TableHead>
              <TableHead>可用率</TableHead>
              <TableHead>最后监测</TableHead>
              <TableHead>质量趋势</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((entry: RelayPulseStatusEntry) => {
              const status = getRelayPulseStatusLabel(
                entry.current_status.status,
              )
              const availability = computeRelayPulseAvailabilityPercent(entry)
              return (
                <TableRow
                  key={`${entry.provider_slug}:${entry.service}:${entry.channel}`}
                >
                  <TableCell className="font-medium">{entry.channel}</TableCell>
                  <TableCell>
                    <span
                      className={
                        'rounded-none px-2 py-0.5 text-xs ' + status.className
                      }
                    >
                      {status.text}
                    </span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {entry.current_status.latency}ms
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {availability.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatRelayPulseTimestampSeconds(
                      entry.current_status.timestamp,
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusTrend entry={entry} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function RelayPulse88codeCard() {
  const ccQuery = useRelayPulseStatus({
    period: '90m',
    board: 'hot',
    provider: '88code',
    service: 'cc',
  })

  const cxQuery = useRelayPulseStatus({
    period: '90m',
    board: 'hot',
    provider: '88code',
    service: 'cx',
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4" />
              88code 服务状态
            </CardTitle>
            <CardDescription>来源：RelayPulse · 近90分钟</CardDescription>
          </div>
          <Link to="/status">
            <Button variant="outline" size="sm">
              查看详情
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <RelayPulseServiceSection
          title="Claude Code (CC)"
          entries={ccQuery.data ?? []}
          isLoading={ccQuery.isLoading}
          error={ccQuery.error}
        />
        <RelayPulseServiceSection
          title="Claude Code Max (CX)"
          entries={cxQuery.data ?? []}
          isLoading={cxQuery.isLoading}
          error={cxQuery.error}
        />
      </CardContent>
    </Card>
  )
}

export function Dashboard() {
  const { accounts } = useAccounts()
  const queryClient = useQueryClient()
  const { enabled: relayPulseEnabled } = useRelayPulseSettings()
  const totals = useDashboardTotals(accounts)

  const refreshAll = async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: queryKeys.all }),
      queryClient.refetchQueries({ queryKey: relayPulseQueryKeys.all }),
    ])
  }

  if (accounts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6">
        <div className="text-center">
          <Wallet className="text-muted-foreground mx-auto mb-4 size-16" />
          <h2 className="mb-2 text-xl font-semibold">还没有添加账号</h2>
          <p className="text-muted-foreground">
            添加您的 88Code 账号以开始管理
          </p>
        </div>
        <Link to="/settings">
          <Button>
            <Settings className="mr-2 size-4" />
            添加账号
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">综合面板</h1>
          <p className="text-muted-foreground">
            管理 {accounts.length} 个 88Code 账号
          </p>
        </div>
        <Button variant="outline" onClick={refreshAll}>
          <RefreshCw className="mr-1 size-4" />
          刷新
        </Button>
      </div>

      {/* Totals */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Card size="sm">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-muted-foreground text-xs">账号总数</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {totals.activeSubscriptions}
            </div>
            <p className="text-muted-foreground text-xs">活跃订阅</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              ${totals.totalCredits.toFixed(2)}
            </div>
            <p className="text-muted-foreground text-xs">总额度</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              ${totals.remainingCredits.toFixed(2)}
            </div>
            <p className="text-muted-foreground text-xs">剩余额度</p>
          </CardContent>
        </Card>
      </div>

      {relayPulseEnabled && (
        <div className="mb-8">
          <RelayPulse88codeCard />
        </div>
      )}

      {/* Accounts */}
      <div className="space-y-4">
        {accounts.map((account) => (
          <AccountSummaryCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  )
}
