import * as React from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import type {
  RelayPulseBoard,
  RelayPulsePeriod,
  RelayPulseStatusEntry,
} from '@gaubee/88code-sdk'
import { useRelayPulseStatus } from '@/lib/relaypulse-queries'
import { AutoRefreshEnabledProvider } from '@/lib/auto-refresh-context'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  computeRelayPulseAvailabilityPercent,
  formatRelayPulseTimestampSeconds,
  getRelayPulseStatusLabel,
} from '@/lib/relaypulse-utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type RelayPulseCategory = 'commercial' | 'public' | 'all'
type SortOption =
  | 'channel_desc'
  | 'channel_asc'
  | 'availability_desc'
  | 'availability_asc'
  | 'latency_desc'
  | 'latency_asc'

const PERIOD_OPTIONS: Array<{ value: RelayPulsePeriod; label: string }> = [
  { value: '90m', label: '近90分钟' },
  { value: '24h', label: '近24小时' },
  { value: '7d', label: '近7天' },
  { value: '30d', label: '近30天' },
]

const BOARD_OPTIONS: Array<{ value: RelayPulseBoard; label: string }> = [
  { value: 'hot', label: '热榜' },
  { value: 'cold', label: '冷榜' },
  { value: 'all', label: '全部' },
]

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'channel_desc', label: '通道 ↓' },
  { value: 'channel_asc', label: '通道 ↑' },
  { value: 'availability_desc', label: '可用率 ↓' },
  { value: 'availability_asc', label: '可用率 ↑' },
  { value: 'latency_asc', label: '延迟 ↑' },
  { value: 'latency_desc', label: '延迟 ↓' },
]

function isRelayPulsePeriod(value: string | null): value is RelayPulsePeriod {
  return value !== null && PERIOD_OPTIONS.some((opt) => opt.value === value)
}

function isRelayPulseBoard(value: string | null): value is RelayPulseBoard {
  return value !== null && BOARD_OPTIONS.some((opt) => opt.value === value)
}

function isRelayPulseCategory(
  value: string | null,
): value is RelayPulseCategory {
  return value === 'all' || value === 'commercial' || value === 'public'
}

function isSortOption(value: string | null): value is SortOption {
  return value !== null && SORT_OPTIONS.some((opt) => opt.value === value)
}

function StatusTrend({ entry }: { entry: RelayPulseStatusEntry }) {
  return (
    <div className="flex items-center gap-0.5">
      {entry.timeline.map((point) => {
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

export function RelayPulseStatusPage() {
  const [autoRefreshEnabled, setAutoRefreshEnabled] = React.useState(true)

  return (
    <AutoRefreshEnabledProvider enabled={autoRefreshEnabled}>
      <RelayPulseStatusPageContent
        autoRefreshEnabled={autoRefreshEnabled}
        onAutoRefreshChange={setAutoRefreshEnabled}
      />
    </AutoRefreshEnabledProvider>
  )
}

function RelayPulseStatusPageContent({
  autoRefreshEnabled,
  onAutoRefreshChange,
}: {
  autoRefreshEnabled: boolean
  onAutoRefreshChange: (enabled: boolean) => void
}) {
  const [period, setPeriod] = React.useState<RelayPulsePeriod>('90m')
  const [board, setBoard] = React.useState<RelayPulseBoard>('hot')
  const [category, setCategory] =
    React.useState<RelayPulseCategory>('commercial')
  const [provider, setProvider] = React.useState<string>('all')
  const [service, setService] = React.useState<string>('all')
  const [channel, setChannel] = React.useState<string>('all')
  const [sort, setSort] = React.useState<SortOption>('channel_desc')
  const [search, setSearch] = React.useState<string>('')

  const { data, isLoading, error, refetch, isFetching } = useRelayPulseStatus({
    period,
    board,
  })

  const providers = React.useMemo(() => {
    const set = new Set<string>()
    for (const item of data ?? []) set.add(item.provider)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [data])

  const services = React.useMemo(() => {
    const set = new Set<string>()
    for (const item of data ?? []) set.add(item.service)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [data])

  const channels = React.useMemo(() => {
    const set = new Set<string>()
    for (const item of data ?? []) set.add(item.channel)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [data])

  const filtered = React.useMemo(() => {
    const keyword = search.trim().toLowerCase()
    const list = (data ?? [])
      .filter((item) =>
        category === 'all' ? true : item.category === category,
      )
      .filter((item) =>
        provider === 'all' ? true : item.provider === provider,
      )
      .filter((item) => (service === 'all' ? true : item.service === service))
      .filter((item) => (channel === 'all' ? true : item.channel === channel))
      .filter((item) => {
        if (!keyword) return true
        return (
          item.provider.toLowerCase().includes(keyword) ||
          item.channel.toLowerCase().includes(keyword) ||
          item.service.toLowerCase().includes(keyword)
        )
      })

    return list.sort((a, b) => {
      if (sort === 'channel_desc') return b.channel.localeCompare(a.channel)
      if (sort === 'channel_asc') return a.channel.localeCompare(b.channel)
      if (sort === 'latency_desc')
        return b.current_status.latency - a.current_status.latency
      if (sort === 'latency_asc')
        return a.current_status.latency - b.current_status.latency
      if (sort === 'availability_desc') {
        return (
          computeRelayPulseAvailabilityPercent(b) -
          computeRelayPulseAvailabilityPercent(a)
        )
      }
      if (sort === 'availability_asc') {
        return (
          computeRelayPulseAvailabilityPercent(a) -
          computeRelayPulseAvailabilityPercent(b)
        )
      }
      return 0
    })
  }, [data, category, provider, service, channel, search, sort])

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Activity className="size-6" />
            服务可用状态
          </h1>
          <p className="text-muted-foreground">
            基于 RelayPulse 的公开探测数据（按 period 聚合）
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-refresh-status"
              checked={autoRefreshEnabled}
              onCheckedChange={onAutoRefreshChange}
            />
            <Label
              htmlFor="auto-refresh-status"
              className="cursor-pointer text-sm"
            >
              自动刷新
            </Label>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={
                isFetching ? 'mr-1 size-4 animate-spin' : 'mr-1 size-4'
              }
            />
            刷新
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">过滤</CardTitle>
          <CardDescription>
            选择 period/榜单，并在本地过滤 provider/service/channel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-7">
            <div className="md:col-span-1">
              <Label htmlFor="relaypulse-period" className="text-muted-foreground mb-1 block text-xs">
                时间范围
              </Label>
              <Select
                value={period}
                onValueChange={(v) => {
                  if (isRelayPulsePeriod(v)) setPeriod(v)
                }}
              >
                <SelectTrigger id="relaypulse-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Label htmlFor="relaypulse-board" className="text-muted-foreground mb-1 block text-xs">
                榜单
              </Label>
              <Select
                value={board}
                onValueChange={(v) => {
                  if (isRelayPulseBoard(v)) setBoard(v)
                }}
              >
                <SelectTrigger id="relaypulse-board">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOARD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Label htmlFor="relaypulse-category" className="text-muted-foreground mb-1 block text-xs">
                分类
              </Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  if (isRelayPulseCategory(v)) setCategory(v)
                }}
              >
                <SelectTrigger id="relaypulse-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="commercial">商业站</SelectItem>
                  <SelectItem value="public">公共站</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Label htmlFor="relaypulse-provider" className="text-muted-foreground mb-1 block text-xs">
                Provider
              </Label>
              <Select
                value={provider}
                onValueChange={(v) => v && setProvider(v)}
              >
                <SelectTrigger id="relaypulse-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有 Provider</SelectItem>
                  {providers.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Label htmlFor="relaypulse-service" className="text-muted-foreground mb-1 block text-xs">
                Service
              </Label>
              <Select value={service} onValueChange={(v) => v && setService(v)}>
                <SelectTrigger id="relaypulse-service">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有 Service</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Label htmlFor="relaypulse-channel" className="text-muted-foreground mb-1 block text-xs">
                Channel
              </Label>
              <Select value={channel} onValueChange={(v) => v && setChannel(v)}>
                <SelectTrigger id="relaypulse-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有 Channel</SelectItem>
                  {channels.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Label htmlFor="relaypulse-sort" className="text-muted-foreground mb-1 block text-xs">
                排序
              </Label>
              <Select
                value={sort}
                onValueChange={(v) => {
                  if (isSortOption(v)) setSort(v)
                }}
              >
                <SelectTrigger id="relaypulse-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-7">
              <Label htmlFor="relaypulse-search" className="text-muted-foreground mb-1 block text-xs">
                搜索
              </Label>
              <Input
                id="relaypulse-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索 provider/service/channel..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">状态列表</CardTitle>
          <CardDescription>
            共 {filtered.length} 条{isLoading ? '（加载中）' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-destructive text-sm">{error.message}</p>
          ) : isLoading && !data ? (
            <p className="text-muted-foreground text-sm">加载中...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>当前状态</TableHead>
                  <TableHead>可用率</TableHead>
                  <TableHead>最后监测</TableHead>
                  <TableHead>质量趋势</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const current = getRelayPulseStatusLabel(
                    item.current_status.status,
                  )
                  const availability =
                    computeRelayPulseAvailabilityPercent(item)
                  return (
                    <TableRow
                      key={`${item.provider_slug}:${item.service}:${item.channel}`}
                    >
                      <TableCell className="font-medium">
                        {item.provider}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.service}</Badge>
                      </TableCell>
                      <TableCell>{item.channel}</TableCell>
                      <TableCell>
                        <span
                          className={
                            'rounded-none px-2 py-0.5 text-xs ' +
                            current.className
                          }
                        >
                          {current.text}
                        </span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {item.current_status.latency}ms
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {availability.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatRelayPulseTimestampSeconds(
                          item.current_status.timestamp,
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusTrend entry={item} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
