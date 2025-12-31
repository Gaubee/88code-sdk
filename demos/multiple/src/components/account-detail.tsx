import { RefreshCw, User, AlertCircle, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getAccountById } from "@/lib/accounts-store";
import { useLoginInfo, queryKeys } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { CardErrorBoundary } from "@/components/ui/card-error-boundary";
import {
  DashboardOverviewCard,
  SubscriptionsCard,
  CodexFreeCard,
  ApiKeysCard,
  ModelUsageCard,
  CreditHistoryCard,
} from "@/components/account";

interface AccountDetailProps {
  accountId: string;
}

export function AccountDetail({ accountId }: AccountDetailProps) {
  const account = getAccountById(accountId) ?? null;
  const queryClient = useQueryClient();
  const { data: loginInfo, isLoading, error } = useLoginInfo(account);

  const handleRefreshAll = () => {
    if (account) {
      queryClient.invalidateQueries({ queryKey: queryKeys.account(account.id) });
    }
  };

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="size-12 text-destructive" />
        <p className="text-destructive">账号不存在</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="size-12 text-destructive" />
        <p className="text-destructive">{error.message}</p>
        <Button onClick={handleRefreshAll}>重试</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="size-6" />
            {account.name}
          </h1>
          {loginInfo && (
            <p className="text-muted-foreground">
              {loginInfo.actualName} ({loginInfo.email})
            </p>
          )}
        </div>
        <Button variant="outline" onClick={handleRefreshAll}>
          <RefreshCw className="size-4 mr-1" />
          刷新
        </Button>
      </div>

      {/* Dashboard Overview */}
      <CardErrorBoundary title="仪表盘数据">
        <DashboardOverviewCard account={account} />
      </CardErrorBoundary>

      {/* Codex Free */}
      <CardErrorBoundary title="Codex Free 额度">
        <CodexFreeCard account={account} />
      </CardErrorBoundary>

      {/* Subscriptions */}
      <CardErrorBoundary title="订阅与额度">
        <SubscriptionsCard account={account} />
      </CardErrorBoundary>

      {/* API Keys & Model Usage Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CardErrorBoundary title="API Keys">
          <ApiKeysCard account={account} />
        </CardErrorBoundary>

        <CardErrorBoundary title="模型用量">
          <ModelUsageCard account={account} />
        </CardErrorBoundary>
      </div>

      {/* Credit History */}
      <CardErrorBoundary title="Credit 变更历史">
        <CreditHistoryCard account={account} />
      </CardErrorBoundary>
    </div>
  );
}
