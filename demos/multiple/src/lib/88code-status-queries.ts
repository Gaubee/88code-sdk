import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { get88codeStatus, OFFICIAL_STATUS_API_URL } from '@gaubee/88code-sdk'
import type { OfficialStatusResponse } from '@gaubee/88code-sdk'
import { useRefresh, useRegisterRefetch } from './refresh-context'

export const officialStatusQueryKeys = {
  all: ['official-status'] as const,
  status: (baseUrl: string) =>
    [...officialStatusQueryKeys.all, 'status', baseUrl] as const,
}

export interface UseOfficialStatusOptions {
  enabled?: boolean
  baseUrl?: string
}

export function useOfficialStatus(options: UseOfficialStatusOptions = {}) {
  const { interval } = useRefresh()
  const enabled = options.enabled ?? true
  const effectiveBaseUrl = options.baseUrl || OFFICIAL_STATUS_API_URL

  const queryKey = React.useMemo(
    () => officialStatusQueryKeys.status(effectiveBaseUrl),
    [effectiveBaseUrl],
  )

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<OfficialStatusResponse> => {
      const result = await get88codeStatus({ baseUrl: effectiveBaseUrl })
      if (!result.success) {
        throw new Error(result.message || '获取官方状态失败')
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
