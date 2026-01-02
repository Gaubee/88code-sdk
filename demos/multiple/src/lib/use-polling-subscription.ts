import * as React from 'react'
import type { QueryKey } from '@tanstack/react-query'
import { useService } from './service-context'

/**
 * 将 Query 与 PollingManager 绑定：组件挂载即订阅、卸载即取消。
 *
 * 简化版：不需要页面级开关，组件存在就自动轮询。
 */
export function usePollingSubscription(
  queryKey: QueryKey,
  queryFn: () => Promise<unknown>,
  queryEnabled: boolean,
) {
  const { pollingManager } = useService()

  const queryKeyRef = React.useRef(queryKey)
  const queryFnRef = React.useRef(queryFn)
  queryKeyRef.current = queryKey
  queryFnRef.current = queryFn

  React.useEffect(() => {
    if (!queryEnabled) return
    return pollingManager.subscribe(queryKeyRef.current, () =>
      queryFnRef.current(),
    )
  }, [queryEnabled, pollingManager])
}
