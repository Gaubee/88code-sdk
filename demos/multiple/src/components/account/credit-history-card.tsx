import { History } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  LoadingCard,
  QueryErrorFallback,
} from '@/components/ui/card-error-boundary'
import { DebugRefreshInfo } from '@/components/ui/debug-refresh-info'
import { useCreditHistory, queryKeys } from '@/lib/queries'
import type { Account } from '@/lib/accounts-store'

interface Props {
  account: Account
}

export function CreditHistoryCard({ account }: Props) {
  const {
    data: creditHistory,
    isLoading,
    error,
    refetch,
  } = useCreditHistory(account)

  if (isLoading) {
    return <LoadingCard title="Credit 变更历史" />
  }

  if (error) {
    return (
      <QueryErrorFallback
        title="Credit 变更历史"
        error={error}
        onRetry={() => refetch()}
      />
    )
  }

  const history = creditHistory ?? []

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4" />
          Credit 变更历史 (最近 50 条)
        </CardTitle>
        <DebugRefreshInfo
          queryKey={queryKeys.creditHistory(account.id)}
          label="creditHistory"
        />
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center">暂无历史记录</p>
        ) : (
          <ScrollArea className="h-96 pr-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>描述</TableHead>
                  <TableHead>模型</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead className="text-right">变化</TableHead>
                  <TableHead className="text-right">余额</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.description || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {item.requestModel ?? '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : '-'}
                    </TableCell>
                    <TableCell
                      className={`text-right whitespace-nowrap ${
                        (item.creditChange ?? 0) >= 0
                          ? 'text-green-600'
                          : 'text-destructive'
                      }`}
                    >
                      {(item.creditChange ?? 0) >= 0 ? '+' : ''}$
                      {Math.abs(item.creditChange ?? 0).toFixed(4)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right whitespace-nowrap">
                      ${(item.creditsAfter ?? 0).toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
