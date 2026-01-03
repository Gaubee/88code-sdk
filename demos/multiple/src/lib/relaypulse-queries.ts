import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRelayPulseStatus, RELAYPULSE_BASE_URL } from '@gaubee/88code-sdk'
import type {
  RelayPulseBoard,
  RelayPulsePeriod,
  RelayPulseStatusEntry,
} from '@gaubee/88code-sdk'
import { useRefresh, useRegisterRefetch } from './refresh-context'
import { useRelayPulseSettings } from './service-context'

export const relayPulseQueryKeys = {
  all: ['relaypulse'] as const,
  status: (params: NormalizedStatusParams, baseUrl: string) =>
    [
      ...relayPulseQueryKeys.all,
      'status',
      baseUrl,
      params.period,
      params.board,
      params.provider,
      params.service,
      params.channel,
      params.category,
      params.sort,
    ] as const,
}

export interface UseRelayPulseStatusOptions {
  period?: RelayPulsePeriod
  board?: RelayPulseBoard
  provider?: string
  service?: string
  channel?: string
  category?: string
  sort?: string
}

interface NormalizedStatusParams {
  period: RelayPulsePeriod
  board: RelayPulseBoard
  provider: string
  service: string
  channel: string
  category: string
  sort: string
}

function normalizeStatusParams(
  options: UseRelayPulseStatusOptions,
): NormalizedStatusParams {
  return {
    period: options.period ?? '90m',
    board: options.board ?? 'hot',
    provider: options.provider ?? '',
    service: options.service ?? '',
    channel: options.channel ?? '',
    category: options.category ?? '',
    sort: options.sort ?? '',
  }
}

export function useRelayPulseStatus(options: UseRelayPulseStatusOptions = {}) {
  const { enabled, baseUrl: configuredBaseUrl } = useRelayPulseSettings()
  const { interval } = useRefresh()
  const effectiveBaseUrl = configuredBaseUrl || RELAYPULSE_BASE_URL

  const params = React.useMemo(
    () => normalizeStatusParams(options),
    [
      options.period,
      options.board,
      options.provider,
      options.service,
      options.channel,
      options.category,
      options.sort,
    ],
  )

  const queryKey = React.useMemo(
    () => relayPulseQueryKeys.status(params, effectiveBaseUrl),
    [params, effectiveBaseUrl],
  )

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<RelayPulseStatusEntry[]> => {
      const result = await getRelayPulseStatus(params, {
        baseUrl: effectiveBaseUrl,
      })
      if (!result.success) {
        throw new Error(result.message || '获取 RelayPulse 状态失败')
      }
      return result.data
    },
    enabled,
    refetchInterval: enabled ? interval : false,
  })

  useRegisterRefetch(JSON.stringify(queryKey), query.refetch, enabled)

  return {
    ...query,
    queryKey,
  }
}
