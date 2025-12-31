/**
 * TanStack Query hooks for 88Code SDK
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Code88Client, Code88Queries, createMutations } from "@gaubee/88code-sdk";
import type { Account } from "./accounts-store";

// Query keys factory
export const queryKeys = {
  all: ["88code"] as const,
  account: (accountId: string) => [...queryKeys.all, "account", accountId] as const,
  loginInfo: (accountId: string) => [...queryKeys.account(accountId), "loginInfo"] as const,
  subscriptions: (accountId: string) => [...queryKeys.account(accountId), "subscriptions"] as const,
  codexFreeQuota: (accountId: string) => [...queryKeys.account(accountId), "codexFreeQuota"] as const,
  dashboard: (accountId: string) => [...queryKeys.account(accountId), "dashboard"] as const,
  apiKeys: (accountId: string) => [...queryKeys.account(accountId), "apiKeys"] as const,
  creditHistory: (accountId: string) => [...queryKeys.account(accountId), "creditHistory"] as const,
  modelUsage: (accountId: string) => [...queryKeys.account(accountId), "modelUsage"] as const,
};

// Helper to create client and queries
function createClientAndQueries(account: Account) {
  const client = new Code88Client({
    authToken: account.token,
    baseUrl: account.apiHost,
  });
  return { client, queries: new Code88Queries(client) };
}

// Login Info Query
export function useLoginInfo(account: Account | null) {
  return useQuery({
    queryKey: queryKeys.loginInfo(account?.id ?? ""),
    queryFn: async () => {
      if (!account) throw new Error("No account");
      const { queries } = createClientAndQueries(account);
      const result = await queries.getLoginInfo();
      if (!result.success) throw new Error(result.message || "获取登录信息失败");
      return result.data;
    },
    enabled: !!account,
  });
}

// Subscriptions Query
export function useSubscriptions(account: Account | null) {
  return useQuery({
    queryKey: queryKeys.subscriptions(account?.id ?? ""),
    queryFn: async () => {
      if (!account) throw new Error("No account");
      const { queries } = createClientAndQueries(account);
      const result = await queries.getAllSubscriptions();
      if (!result.success) throw new Error(result.message || "获取订阅失败");
      return result.data;
    },
    enabled: !!account,
  });
}

// Codex Free Quota Query
export function useCodexFreeQuota(account: Account | null) {
  return useQuery({
    queryKey: queryKeys.codexFreeQuota(account?.id ?? ""),
    queryFn: async () => {
      if (!account) throw new Error("No account");
      const { queries } = createClientAndQueries(account);
      const result = await queries.getCodexFreeQuota();
      if (!result.success) throw new Error(result.message || "获取 Codex Free 额度失败");
      return result.data;
    },
    enabled: !!account,
  });
}

// Dashboard Query
export function useDashboard(account: Account | null) {
  return useQuery({
    queryKey: queryKeys.dashboard(account?.id ?? ""),
    queryFn: async () => {
      if (!account) throw new Error("No account");
      const { queries } = createClientAndQueries(account);
      const result = await queries.getDashboard();
      if (!result.success) throw new Error(result.message || "获取仪表盘失败");
      return result.data;
    },
    enabled: !!account,
  });
}

// API Keys Query
export function useApiKeys(account: Account | null) {
  return useQuery({
    queryKey: queryKeys.apiKeys(account?.id ?? ""),
    queryFn: async () => {
      if (!account) throw new Error("No account");
      const { queries } = createClientAndQueries(account);
      const result = await queries.queryApiKeys({ pageNum: 1, pageSize: 100 });
      if (!result.success) throw new Error(result.message || "获取 API Keys 失败");
      return result.data.list;
    },
    enabled: !!account,
  });
}

// Credit History Query
export function useCreditHistory(account: Account | null) {
  return useQuery({
    queryKey: queryKeys.creditHistory(account?.id ?? ""),
    queryFn: async () => {
      if (!account) throw new Error("No account");
      const { queries } = createClientAndQueries(account);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const result = await queries.getCreditHistory({
        startTime: thirtyDaysAgo,
        endTime: now,
        pageNum: 1,
        pageSize: 50,
      });
      if (!result.success) throw new Error(result.message || "获取历史记录失败");
      return result.data.list;
    },
    enabled: !!account,
  });
}

// Model Usage Query
export function useModelUsage(account: Account | null) {
  return useQuery({
    queryKey: queryKeys.modelUsage(account?.id ?? ""),
    queryFn: async () => {
      if (!account) throw new Error("No account");
      const { queries } = createClientAndQueries(account);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const result = await queries.getModelUsageTimeline({
        startDate: thirtyDaysAgo,
        endDate: now,
        granularity: "day",
      });
      if (!result.success) throw new Error(result.message || "获取模型用量失败");
      return result.data;
    },
    enabled: !!account,
  });
}

// Reset Credits Mutation
export function useResetCredits(account: Account | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionId: number) => {
      if (!account) throw new Error("No account");
      const client = new Code88Client({
        authToken: account.token,
        baseUrl: account.apiHost,
      });
      const mutations = createMutations(client, "I_UNDERSTAND_THE_RISKS");
      const result = await mutations.resetCredits(subscriptionId);
      if (!result.success) throw new Error(result.message || "重置失败");
      return result;
    },
    onSuccess: () => {
      // Invalidate subscriptions to refetch
      if (account) {
        queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions(account.id) });
      }
    },
  });
}
