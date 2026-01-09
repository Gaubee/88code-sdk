import * as React from 'react'
import type {
  CodexFreeQuota,
  OfficialStatusProvider,
  OfficialStatusTimelinePoint,
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
import { DebugRefreshInfo } from '@/components/ui/debug-refresh-info'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Account } from '@/lib/accounts-store'
import {
  queryKeys,
  useCodexFreeQuota,
  useLoginInfo,
  useResetCredits,
  useSubscriptions,
} from '@/lib/queries'
import { useOfficialStatus } from '@/lib/88code-status-queries'
import {
  formatCheckedAt,
  getOfficialStatusLabel,
  groupProvidersByDisplayGroup,
} from '@/lib/88code-status-utils'
import { useAccounts, useRefresh } from '@/lib/use-sdk'

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
        <DebugRefreshInfo
          queryKey={queryKeys.loginInfo(account.id)}
          label="登录信息"
        />
        <DebugRefreshInfo
          queryKey={queryKeys.subscriptions(account.id)}
          label="订阅"
        />
        <DebugRefreshInfo
          queryKey={queryKeys.codexFreeQuota(account.id)}
          label="Codex Free"
        />
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

function OfficialStatusTimeline({
  timeline,
}: {
  timeline: OfficialStatusTimelinePoint[]
}) {
  if (timeline.length === 0) return null

  const displayTimeline = timeline.slice(0, 60)

  return (
    <div className="flex items-center gap-0.5">
      {displayTimeline.map((point, index) => {
        const status = getOfficialStatusLabel(point.status)
        const latencyText =
          point.latency_ms != null ? `${point.latency_ms}ms` : 'N/A'
        return (
          <div
            key={index}
            title={`${formatCheckedAt(point.checked_at)} · ${status.text} · ${latencyText}`}
            className={'h-3 w-1.5 rounded-none ' + status.className}
          />
        )
      })}
    </div>
  )
}

function MicroTrendLine({
  timeline,
}: {
  timeline: OfficialStatusTimelinePoint[]
}) {
  if (timeline.length === 0) return null
  // 取最近 40 个点
  const displayTimeline = timeline.slice(0, 40)

  return (
    <div className="flex h-1 w-full max-w-[80px] overflow-hidden rounded-full opacity-80">
      {displayTimeline.map((point, index) => {
        let colorClass = 'bg-muted'
        if (point.status === 'operational') colorClass = 'bg-green-500'
        else if (point.status === 'degraded') colorClass = 'bg-amber-500'
        else if (point.status === 'error') colorClass = 'bg-red-500'

        return <div key={index} className={`flex-1 ${colorClass}`} />
      })}
    </div>
  )
}

function OfficialStatusGroupSection({
  title,
  providers,
  isLoading,
  error,
}: {
  title: string
  providers: OfficialStatusProvider[]
  isLoading: boolean
  error: Error | null
}) {
  return (
    <div className="space-y-2 @container">
      <h4 className="text-muted-foreground text-sm font-medium">{title}</h4>
      {error ? (
        <p className="text-destructive text-sm">{error.message}</p>
      ) : isLoading && providers.length === 0 ? (
        <p className="text-muted-foreground text-sm">加载中...</p>
      ) : providers.length === 0 ? (
        <p className="text-muted-foreground text-sm">暂无数据</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">节点</TableHead>
              <TableHead className="whitespace-nowrap">当前状态</TableHead>
              <TableHead className="hidden @md:table-cell whitespace-nowrap">
                成功率
              </TableHead>
              <TableHead className="hidden @lg:table-cell whitespace-nowrap">
                最后监测
              </TableHead>
              <TableHead className="hidden @xl:table-cell whitespace-nowrap">
                质量趋势
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((provider) => {
              const status = getOfficialStatusLabel(provider.latest.status)
              const latencyText =
                provider.latest.latency_ms != null
                  ? `${provider.latest.latency_ms}ms`
                  : 'N/A'
              return (
                <TableRow key={provider.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    <div>{provider.name}</div>
                    <div className="mt-1 block @xl:hidden">
                      <MicroTrendLine timeline={provider.timeline} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          'rounded-none px-2 py-0.5 text-xs ' + status.className
                        }
                      >
                        {status.text}
                      </span>
                      <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {latencyText}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden @md:table-cell text-xs">
                    {provider.statistics.success_rate.toFixed(2)}%
                  </TableCell>
                  <TableCell className="hidden @lg:table-cell text-muted-foreground text-xs">
                    {formatCheckedAt(provider.latest.checked_at)}
                  </TableCell>
                  <TableCell className="hidden @xl:table-cell">
                    <OfficialStatusTimeline timeline={provider.timeline} />
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

function Official88codeStatusCard() {
  const statusQuery = useOfficialStatus()

  const groupedProviders = React.useMemo(() => {
    if (!statusQuery.data?.providers) return new Map()
    return groupProvidersByDisplayGroup(statusQuery.data.providers)
  }, [statusQuery.data?.providers])

  const groupOrder = ['Claude V5', 'Claude V3', 'Codex']
  const sortedGroups = Array.from(groupedProviders.entries()).sort(
    ([a], [b]) => {
      const aIndex = groupOrder.indexOf(a)
      const bIndex = groupOrder.indexOf(b)
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b)
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    },
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4" />
              88code 服务状态
            </CardTitle>
            <CardDescription>来源：88code 官方 · 每分钟更新</CardDescription>
          </div>
          <Link to="/status">
            <Button variant="outline" size="sm">
              查看详情
            </Button>
          </Link>
        </div>
        <DebugRefreshInfo
          queryKey={statusQuery.queryKey}
          label="Official Status"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedGroups.map(([group, providers]) => (
          <OfficialStatusGroupSection
            key={group}
            title={group}
            providers={providers}
            isLoading={statusQuery.isLoading}
            error={statusQuery.error}
          />
        ))}
        {sortedGroups.length === 0 && !statusQuery.isLoading && (
          <p className="text-muted-foreground text-sm">暂无状态数据</p>
        )}
        {statusQuery.isLoading && sortedGroups.length === 0 && (
          <p className="text-muted-foreground text-sm">加载中...</p>
        )}
      </CardContent>
    </Card>
  )
}

export function Dashboard() {
  const { accounts } = useAccounts()
  const { refreshAll } = useRefresh()
  const totals = useDashboardTotals(accounts)

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

      <div className="mb-8">
        <Official88codeStatusCard />
      </div>

      {/* Accounts */}
      <div className="space-y-4">
        {accounts.map((account) => (
          <AccountSummaryCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  )
}
