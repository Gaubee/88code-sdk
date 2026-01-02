/**
 * 88Code SDK React Hooks
 * 向后兼容层 - 重新导出 service-context 中的函数
 */

import { useMemo } from 'react'
import { Code88Client, Code88Queries } from '@gaubee/88code-sdk'
import {
  useService,
  useAccounts as useAccountsFromContext,
} from './service-context'
export { useService } from './service-context'
import type { Account } from './accounts-store'
import { DEFAULT_API_HOST } from './accounts-store'

export {
  AutoRefreshEnabledProvider,
  AutoRefreshIntervalProvider,
  useAutoRefreshEnabled,
  useAutoRefreshInterval,
  useAutoRefresh,
} from './auto-refresh-context'

export { useSettings } from './settings-store'

/**
 * 账号管理 Hook
 * 向后兼容：从 service-context 代理
 */
export function useAccounts() {
  return useAccountsFromContext()
}

/**
 * 创建 88Code 客户端
 */
export function useCode88Client(token: string, apiHost?: string) {
  return useMemo(() => {
    if (!token) return null
    return new Code88Client({
      authToken: token,
      baseUrl: apiHost || DEFAULT_API_HOST,
    })
  }, [token, apiHost])
}

/**
 * 创建 88Code 查询实例
 */
export function useCode88Queries(token: string, apiHost?: string) {
  const client = useCode88Client(token, apiHost)
  return useMemo(() => {
    if (!client) return null
    return new Code88Queries(client)
  }, [client])
}

/**
 * 从 Account 对象创建查询实例
 */
export function useAccountQueries(account: Account | null) {
  return useMemo(() => {
    if (!account) return null
    const client = new Code88Client({
      authToken: account.token,
      baseUrl: account.apiHost,
    })
    return new Code88Queries(client)
  }, [account?.id, account?.token, account?.apiHost])
}
