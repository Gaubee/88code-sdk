import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'
import { useSettings } from '@/lib/settings-store'

interface DebugRefreshInfoProps {
  queryKey: QueryKey
  label?: string
}

export function DebugRefreshInfo({ queryKey, label }: DebugRefreshInfoProps) {
  const { settings } = useSettings()
  const queryClient = useQueryClient()
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0)

  React.useEffect(() => {
    if (!settings.debugMode) return
    const interval = setInterval(forceUpdate, 1000)
    return () => clearInterval(interval)
  }, [settings.debugMode])

  if (!settings.debugMode) return null

  const state = queryClient.getQueryState(queryKey)
  const dataUpdatedAt = state?.dataUpdatedAt
  const isFetching = state?.fetchStatus === 'fetching'

  const formatTime = (ts: number | undefined) => {
    if (!ts) return '未加载'
    const date = new Date(ts)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getSecondsSince = (ts: number | undefined) => {
    if (!ts) return null
    const seconds = Math.floor((Date.now() - ts) / 1000)
    return seconds
  }

  const secondsSince = getSecondsSince(dataUpdatedAt)

  return (
    <div className="mt-1 rounded bg-yellow-100 px-2 py-0.5 font-mono text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
      {label && <span className="font-semibold">{label}: </span>}
      <span>
        最后刷新: {formatTime(dataUpdatedAt)}
        {secondsSince !== null && ` (${secondsSince}s 前)`}
      </span>
      {isFetching && (
        <span className="ml-2 animate-pulse text-blue-600 dark:text-blue-400">
          刷新中...
        </span>
      )}
    </div>
  )
}
