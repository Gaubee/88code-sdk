import * as React from "react";
import type { CodexFreeQuota, RelayPulseStatusEntry, Subscription } from "@gaubee/88code-sdk";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, ChevronRight, RefreshCw, Settings, User, Wallet, Zap } from "lucide-react";
import { SubscriptionPlanCard } from "@/components/account/subscription-plan-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Account } from "@/lib/accounts-store";
import { queryKeys, useCodexFreeQuota, useLoginInfo, useResetCredits, useSubscriptions } from "@/lib/queries";
import { useRelayPulseStatus } from "@/lib/relaypulse-queries";
import { computeRelayPulseAvailabilityPercent, formatRelayPulseTimestampSeconds, getRelayPulseStatusLabel } from "@/lib/relaypulse-utils";
import { useAccounts, useAutoRefresh } from "@/lib/use-sdk";

type DashboardTotals = {
  totalCredits: number;
  remainingCredits: number;
  usedCredits: number;
  activeSubscriptions: number;
};

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function isActiveSubscription(subscription: Subscription): boolean {
  return subscription.subscriptionStatus === "活跃中";
}

function useDashboardTotals(accounts: Account[]): DashboardTotals {
  const queryClient = useQueryClient();

  const getSnapshot = React.useCallback((): DashboardTotals => {
    const totals: DashboardTotals = {
      totalCredits: 0,
      remainingCredits: 0,
      usedCredits: 0,
      activeSubscriptions: 0,
    };

    for (const account of accounts) {
      const subs = queryClient.getQueryData<Subscription[]>(
        queryKeys.subscriptions(account.id)
      );
      const codexFree = queryClient.getQueryData<CodexFreeQuota>(
        queryKeys.codexFreeQuota(account.id)
      );

      for (const sub of (subs ?? []).filter(isActiveSubscription)) {
        totals.totalCredits += clampNonNegative(sub.subscriptionPlan?.creditLimit ?? 0);
        totals.remainingCredits += clampNonNegative(sub.currentCredits ?? 0);
        totals.activeSubscriptions += 1;
      }

      if (codexFree?.enabled) {
        totals.totalCredits += clampNonNegative(codexFree.dailyQuota);
        totals.remainingCredits += clampNonNegative(codexFree.remainingQuota);
        totals.activeSubscriptions += 1;
      }
    }

    totals.usedCredits = totals.totalCredits - totals.remainingCredits;
    return totals;
  }, [accounts, queryClient]);

  return React.useSyncExternalStore(
    React.useCallback(
      (onStoreChange) => queryClient.getQueryCache().subscribe(onStoreChange),
      [queryClient]
    ),
    getSnapshot,
    () => ({ totalCredits: 0, remainingCredits: 0, usedCredits: 0, activeSubscriptions: 0 })
  );
}

function CodexFreeSummary({ quota }: { quota: CodexFreeQuota }) {
  const remainingPercent =
    quota.dailyQuota > 0 ? (quota.remainingQuota / quota.dailyQuota) * 100 : 0;

  return (
    <div className="p-3 border border-purple-500/30 rounded-lg bg-purple-500/5">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="size-4 text-purple-500" />
        <span className="font-medium text-sm">Codex Free 每日免费额度</span>
        <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-600">
          {quota.subscriptionLevel}
        </Badge>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>剩余: ${quota.remainingQuota.toFixed(2)}</span>
          <span>总额度: ${quota.dailyQuota}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all"
            style={{ width: `${Math.min(remainingPercent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function AccountSummaryCard({ account }: { account: Account }) {
  const { data: loginInfo } = useLoginInfo(account);
  const subsQuery = useSubscriptions(account);
  const codexFreeQuery = useCodexFreeQuota(account);
  const resetMutation = useResetCredits(account);
  const [resettingId, setResettingId] = React.useState<number | null>(null);

  const activeSubscriptions =
    subsQuery.data?.filter(isActiveSubscription) ?? [];
  const hasCodexFree = !!codexFreeQuery.data?.enabled;

  const handleReset = async (subscriptionId: number) => {
    setResettingId(subscriptionId);
    try {
      await resetMutation.mutateAsync(subscriptionId);
    } finally {
      setResettingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <User className="size-5 text-muted-foreground" />
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{account.name}</CardTitle>
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
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {subsQuery.isLoading && !subsQuery.data ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            加载中...
          </p>
        ) : subsQuery.error ? (
          <p className="text-xs text-destructive py-4 text-center">
            {subsQuery.error.message}
          </p>
        ) : activeSubscriptions.length === 0 && !hasCodexFree ? (
          <p className="text-muted-foreground text-sm py-2 text-center">
            暂无活跃订阅
          </p>
        ) : (
          <div className="space-y-3">
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
  );
}

function RelayPulse88codeCard() {
  const { data, isLoading, error } = useRelayPulseStatus({
    period: "90m",
    board: "hot",
    provider: "88code",
    service: "cc",
  });

  const items = React.useMemo(() => {
    const list = (data ?? []).slice();
    return list.sort((a, b) => a.channel.localeCompare(b.channel));
  }, [data]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="size-4" />
              88code · Claude Code (CC) 服务状态
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
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : isLoading && !data ? (
          <p className="text-sm text-muted-foreground">加载中...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无数据</p>
        ) : (
          <div className="space-y-2">
            {items.map((entry: RelayPulseStatusEntry) => {
              const status = getRelayPulseStatusLabel(entry.current_status.status);
              const availability = computeRelayPulseAvailabilityPercent(entry);
              return (
                <div
                  key={`${entry.provider_slug}:${entry.service}:${entry.channel}`}
                  className="flex items-center justify-between gap-3 border rounded-none p-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{entry.channel}</div>
                    <div className="text-muted-foreground truncate">
                      {formatRelayPulseTimestampSeconds(entry.current_status.timestamp)} · {entry.current_status.latency}ms
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={"px-2 py-0.5 rounded-none " + status.className}>
                      {status.text}
                    </span>
                    <span className="text-muted-foreground">{availability.toFixed(2)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { accounts } = useAccounts();
  const queryClient = useQueryClient();
  const { enabled: autoRefreshEnabled, toggle: toggleAutoRefresh } = useAutoRefresh();
  const totals = useDashboardTotals(accounts);

  const refreshAll = async () => {
    await queryClient.refetchQueries({ queryKey: queryKeys.all });
  };

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="text-center">
          <Wallet className="size-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">还没有添加账号</h2>
          <p className="text-muted-foreground">添加您的 88Code 账号以开始管理</p>
        </div>
        <Link to="/settings">
          <Button>
            <Settings className="size-4 mr-2" />
            添加账号
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">综合面板</h1>
          <p className="text-muted-foreground">管理 {accounts.length} 个 88Code 账号</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-refresh-dashboard"
              size="sm"
              checked={autoRefreshEnabled}
              onCheckedChange={toggleAutoRefresh}
            />
            <Label
              htmlFor="auto-refresh-dashboard"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              自动刷新
            </Label>
          </div>
          <Button variant="outline" onClick={refreshAll}>
            <RefreshCw className="size-4 mr-1" />
            刷新全部
          </Button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card size="sm">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">账号总数</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totals.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">活跃订阅</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">${totals.totalCredits.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">总额度</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              ${totals.remainingCredits.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">剩余额度</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <RelayPulse88codeCard />
      </div>

      {/* Accounts */}
      <div className="space-y-4">
        {accounts.map((account) => (
          <AccountSummaryCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  );
}
