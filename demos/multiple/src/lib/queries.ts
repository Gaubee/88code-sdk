/**
 * TanStack Query hooks for 88Code SDK
 * 支持自动刷新
 */

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Account } from './accounts-store'
import { useService } from './service-context'
import { usePollingSubscription } from './use-polling-subscription'

// ===== Query Keys Factory =====

export const queryKeys = {
  all: ['88code'] as const,
  account: (accountId: string) =>
    [...queryKeys.all, 'account', accountId] as const,
  loginInfo: (accountId: string) =>
    [...queryKeys.account(accountId), 'loginInfo'] as const,
  subscriptions: (accountId: string) =>
    [...queryKeys.account(accountId), 'subscriptions'] as const,
  codexFreeQuota: (accountId: string) =>
    [...queryKeys.account(accountId), 'codexFreeQuota'] as const,
  dashboard: (accountId: string) =>
    [...queryKeys.account(accountId), 'dashboard'] as const,
  apiKeys: (accountId: string) =>
    [...queryKeys.account(accountId), 'apiKeys'] as const,
  creditHistory: (accountId: string) =>
    [...queryKeys.account(accountId), 'creditHistory'] as const,
  modelUsage: (accountId: string) =>
    [...queryKeys.account(accountId), 'modelUsage'] as const,
}

// ===== Helper =====

// ===== Query Hooks =====

/** 登录信息 */
export function useLoginInfo(account: Account | null) {
  const { code88 } = useService()
  const enabled = !!account
  const queryKey = React.useMemo(
    () => queryKeys.loginInfo(account?.id ?? ''),
    [account?.id],
  )
  const queryFn = React.useCallback(async () => {
    if (!account) throw new Error('No account')
    const queries = code88.getQueries(account)
    const result = await queries.getLoginInfo()
    if (!result.success) throw new Error(result.message || '获取登录信息失败')
    return result.data
  }, [account?.id, account?.token, account?.apiHost, code88])

  usePollingSubscription(queryKey, queryFn, enabled)

  return useQuery({ queryKey, queryFn, enabled })
}

/** 订阅列表 */
export function useSubscriptions(account: Account | null) {
  const { code88 } = useService()
  const enabled = !!account
  const queryKey = React.useMemo(
    () => queryKeys.subscriptions(account?.id ?? ''),
    [account?.id],
  )
  const queryFn = React.useCallback(async () => {
    if (!account) throw new Error('No account')
    const queries = code88.getQueries(account)
    const result = await queries.getAllSubscriptions()
    if (!result.success) throw new Error(result.message || '获取订阅失败')
    return result.data
  }, [account?.id, account?.token, account?.apiHost, code88])

  usePollingSubscription(queryKey, queryFn, enabled)

  return useQuery({ queryKey, queryFn, enabled })
}

/** Codex Free 额度 */
export function useCodexFreeQuota(account: Account | null) {
  const { code88 } = useService()
  const enabled = !!account
  const queryKey = React.useMemo(
    () => queryKeys.codexFreeQuota(account?.id ?? ''),
    [account?.id],
  )
  const queryFn = React.useCallback(async () => {
    if (!account) throw new Error('No account')
    const queries = code88.getQueries(account)
    const result = await queries.getCodexFreeQuota()
    if (!result.success)
      throw new Error(result.message || '获取 Codex Free 额度失败')
    return result.data
  }, [account?.id, account?.token, account?.apiHost, code88])

  usePollingSubscription(queryKey, queryFn, enabled)

  return useQuery({ queryKey, queryFn, enabled })
}

/** 仪表盘数据 */
export function useDashboard(account: Account | null) {
  const { code88 } = useService()
  const enabled = !!account
  const queryKey = React.useMemo(
    () => queryKeys.dashboard(account?.id ?? ''),
    [account?.id],
  )
  const queryFn = React.useCallback(async () => {
    if (!account) throw new Error('No account')
    const queries = code88.getQueries(account)
    const result = await queries.getDashboard()
    if (!result.success) throw new Error(result.message || '获取仪表盘失败')
    return result.data
  }, [account?.id, account?.token, account?.apiHost, code88])

  usePollingSubscription(queryKey, queryFn, enabled)

  return useQuery({ queryKey, queryFn, enabled })
}

/** API Keys 列表 */
export function useApiKeys(account: Account | null) {
  const { code88 } = useService()
  const enabled = !!account
  const queryKey = React.useMemo(
    () => queryKeys.apiKeys(account?.id ?? ''),
    [account?.id],
  )
  const queryFn = React.useCallback(async () => {
    if (!account) throw new Error('No account')
    const queries = code88.getQueries(account)
    const result = await queries.queryApiKeys({ pageNum: 1, pageSize: 100 })
    if (!result.success) throw new Error(result.message || '获取 API Keys 失败')
    return result.data.list
  }, [account?.id, account?.token, account?.apiHost, code88])

  usePollingSubscription(queryKey, queryFn, enabled)

  return useQuery({ queryKey, queryFn, enabled })
}

/** Credit 历史记录 */
export function useCreditHistory(account: Account | null) {
  const { code88 } = useService()
  const enabled = !!account
  const queryKey = React.useMemo(
    () => queryKeys.creditHistory(account?.id ?? ''),
    [account?.id],
  )
  const queryFn = React.useCallback(async () => {
    if (!account) throw new Error('No account')
    const queries = code88.getQueries(account)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const result = await queries.getCreditHistory({
      startTime: thirtyDaysAgo,
      endTime: now,
      pageNum: 1,
      pageSize: 50,
    })
    if (!result.success) throw new Error(result.message || '获取历史记录失败')
    return result.data.list
  }, [account?.id, account?.token, account?.apiHost, code88])

  usePollingSubscription(queryKey, queryFn, enabled)

  return useQuery({ queryKey, queryFn, enabled })
}

/** 模型用量统计 */
export function useModelUsage(account: Account | null) {
  const { code88 } = useService()
  const enabled = !!account
  const queryKey = React.useMemo(
    () => queryKeys.modelUsage(account?.id ?? ''),
    [account?.id],
  )
  const queryFn = React.useCallback(async () => {
    if (!account) throw new Error('No account')
    const queries = code88.getQueries(account)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const result = await queries.getModelUsageTimeline({
      startDate: thirtyDaysAgo,
      endDate: now,
      granularity: 'day',
    })
    if (!result.success) throw new Error(result.message || '获取模型用量失败')
    return result.data
  }, [account?.id, account?.token, account?.apiHost, code88])

  usePollingSubscription(queryKey, queryFn, enabled)

  return useQuery({ queryKey, queryFn, enabled })
}

// ===== Mutation Hooks =====

/** 重置额度 */
export function useResetCredits(account: Account | null) {
  const { code88 } = useService()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (subscriptionId: number) => {
      if (!account) throw new Error('No account')
      const mutations = code88.getMutations(account)
      const result = await mutations.resetCredits(subscriptionId)
      if (!result.success) throw new Error(result.message || '重置失败')
      return result
    },
    onSuccess: () => {
      if (account) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.subscriptions(account.id),
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.codexFreeQuota(account.id),
        })
      }
    },
  })
}

// ===== 工具函数 =====

/** 使账号的所有查询失效 */
export function useInvalidateAccount() {
  const queryClient = useQueryClient()

  return (accountId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.account(accountId) })
  }
}

/** 使所有查询失效 */
export function useInvalidateAll() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.all })
  }
}
