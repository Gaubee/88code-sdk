import { Card, CardContent } from '@/components/ui/card'
import {
  LoadingCard,
  QueryErrorFallback,
} from '@/components/ui/card-error-boundary'
import { useDashboard } from '@/lib/queries'
import type { Account } from '@/lib/accounts-store'

interface Props {
  account: Account
}

export function DashboardOverviewCard({ account }: Props) {
  const { data: dashboard, isLoading, error, refetch } = useDashboard(account)

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <LoadingCard key={i} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <QueryErrorFallback
        title="仪表盘数据"
        error={error}
        onRetry={() => refetch()}
      />
    )
  }

  if (!dashboard?.overview) {
    return null
  }

  const overview = dashboard.overview

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-4">
      <Card size="sm">
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">
            {overview.activeApiKeys ?? 0}/{overview.totalApiKeys ?? 0}
          </div>
          <p className="text-muted-foreground text-xs">活跃 API Keys</p>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">
            {(overview.totalRequestsUsed ?? 0).toLocaleString()}
          </div>
          <p className="text-muted-foreground text-xs">总请求数</p>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">
            {((overview.totalTokensUsed ?? 0) / 1000000).toFixed(2)}M
          </div>
          <p className="text-muted-foreground text-xs">总 Token 数</p>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">
            ${(overview.cost ?? 0).toFixed(2)}
          </div>
          <p className="text-muted-foreground text-xs">总费用</p>
        </CardContent>
      </Card>
    </div>
  )
}
