import { useState } from 'react'
import { RefreshCw, User, AlertCircle, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { getAccountById, type Account } from '@/lib/accounts-store'
import { useLoginInfo, queryKeys } from '@/lib/queries'
import { AutoRefreshEnabledProvider } from '@/lib/auto-refresh-context'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { CardErrorBoundary } from '@/components/ui/card-error-boundary'
import {
  DashboardOverviewCard,
  SubscriptionsCard,
  CodexFreeCard,
  ApiKeysCard,
  ModelUsageCard,
  CreditHistoryCard,
} from '@/components/account'

interface AccountDetailProps {
  accountId: string
}

export function AccountDetail({ accountId }: AccountDetailProps) {
  const account = getAccountById(accountId) ?? null
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)

  if (!account) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <AlertCircle className="text-destructive size-12" />
        <p className="text-destructive">账号不存在</p>
      </div>
    )
  }

  return (
    <AutoRefreshEnabledProvider enabled={autoRefreshEnabled}>
      <AccountDetailContent
        account={account}
        autoRefreshEnabled={autoRefreshEnabled}
        onAutoRefreshChange={setAutoRefreshEnabled}
      />
    </AutoRefreshEnabledProvider>
  )
}

interface AccountDetailContentProps {
  account: Account
  autoRefreshEnabled: boolean
  onAutoRefreshChange: (enabled: boolean) => void
}

function AccountDetailContent({
  account,
  autoRefreshEnabled,
  onAutoRefreshChange,
}: AccountDetailContentProps) {
  const queryClient = useQueryClient()
  const { data: loginInfo, isLoading, error } = useLoginInfo(account)

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.account(account.id) })
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <AlertCircle className="text-destructive size-12" />
        <p className="text-destructive">{error.message}</p>
        <Button onClick={handleRefreshAll}>重试</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <User className="size-6" />
            {account.name}
          </h1>
          {loginInfo && (
            <p className="text-muted-foreground">
              {loginInfo.actualName} ({loginInfo.email})
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-refresh-account"
              size="sm"
              checked={autoRefreshEnabled}
              onCheckedChange={onAutoRefreshChange}
            />
            <Label
              htmlFor="auto-refresh-account"
              className="text-muted-foreground cursor-pointer text-sm"
            >
              自动刷新
            </Label>
          </div>
          <Button variant="outline" onClick={handleRefreshAll}>
            <RefreshCw className="mr-1 size-4" />
            刷新
          </Button>
        </div>
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
  )
}
