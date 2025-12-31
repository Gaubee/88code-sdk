/**
 * 88Code SDK React Hooks
 */

import { useMemo, useState, useCallback, useSyncExternalStore } from "react";
import { Code88Client, Code88Queries } from "@gaubee/88code-sdk";
import type {
  LoginInfo,
  Subscription,
  DashboardData,
  ApiKeyInfo,
  CreditHistoryItem,
  ModelUsageTimelinePoint,
} from "@gaubee/88code-sdk";
import {
  getAccounts,
  type Account,
  saveAccounts,
  addAccount as addAccountToStore,
  removeAccount as removeAccountFromStore,
  DEFAULT_API_HOST,
} from "./accounts-store";

// 账号状态订阅
const accountsListeners = new Set<() => void>();

function subscribeToAccounts(listener: () => void) {
  accountsListeners.add(listener);
  return () => accountsListeners.delete(listener);
}

function notifyAccountsChange() {
  accountsListeners.forEach((listener) => listener());
}

let accountsSnapshot = getAccounts();

function getAccountsSnapshot() {
  return accountsSnapshot;
}

function refreshAccountsSnapshot() {
  accountsSnapshot = getAccounts();
  notifyAccountsChange();
}

export function useAccounts() {
  const accounts = useSyncExternalStore(
    subscribeToAccounts,
    getAccountsSnapshot,
    () => []
  );

  const addAccount = useCallback((name: string, token: string, apiHost: string = DEFAULT_API_HOST) => {
    const account = addAccountToStore(name, token, apiHost);
    refreshAccountsSnapshot();
    return account;
  }, []);

  const removeAccount = useCallback((id: string) => {
    removeAccountFromStore(id);
    refreshAccountsSnapshot();
  }, []);

  const updateAccount = useCallback(
    (id: string, updates: Partial<Pick<Account, "name" | "token" | "apiHost">>) => {
      const accounts = getAccounts();
      const index = accounts.findIndex((a) => a.id === id);
      if (index !== -1) {
        accounts[index] = { ...accounts[index], ...updates };
        saveAccounts(accounts);
        refreshAccountsSnapshot();
      }
    },
    []
  );

  return { accounts, addAccount, removeAccount, updateAccount };
}

export function useCode88Client(token: string) {
  return useMemo(() => {
    if (!token) return null;
    return new Code88Client({ authToken: token });
  }, [token]);
}

export function useCode88Queries(token: string) {
  const client = useCode88Client(token);
  return useMemo(() => {
    if (!client) return null;
    return new Code88Queries(client);
  }, [client]);
}

// API 数据 hooks
export interface AccountData {
  loginInfo: LoginInfo | null;
  subscriptions: Subscription[];
  dashboard: DashboardData | null;
  apiKeys: ApiKeyInfo[];
  creditHistory: CreditHistoryItem[];
  modelUsage: ModelUsageTimelinePoint[];
  loading: boolean;
  error: string | null;
}

export function useAccountData(token: string): AccountData & { refetch: () => void } {
  const queries = useCode88Queries(token);
  const [data, setData] = useState<AccountData>({
    loginInfo: null,
    subscriptions: [],
    dashboard: null,
    apiKeys: [],
    creditHistory: [],
    modelUsage: [],
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (!queries) {
      setData((prev) => ({ ...prev, loading: false, error: "No token" }));
      return;
    }

    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [loginResult, subsResult, dashResult, keysResult] =
        await Promise.all([
          queries.getLoginInfo(),
          queries.getSubscriptions(),
          queries.getDashboard(),
          queries.queryApiKeys({ pageNum: 1, pageSize: 100 }),
        ]);

      // 获取最近 30 天的数据
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [historyResult, usageResult] = await Promise.all([
        queries.getCreditHistory({
          startTime: thirtyDaysAgo,
          endTime: now,
          pageNum: 1,
          pageSize: 100,
        }),
        queries.getModelUsageTimeline({
          startDate: thirtyDaysAgo,
          endDate: now,
          granularity: "day",
        }),
      ]);

      setData({
        loginInfo: loginResult.success ? loginResult.data : null,
        subscriptions: subsResult.success ? subsResult.data : [],
        dashboard: dashResult.success ? dashResult.data : null,
        apiKeys: keysResult.success ? keysResult.data.list : [],
        creditHistory: historyResult.success ? historyResult.data.list : [],
        modelUsage: usageResult.success ? usageResult.data : [],
        loading: false,
        error: null,
      });
    } catch (err) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, [queries]);

  // 初始加载
  useState(() => {
    fetchData();
  });

  return { ...data, refetch: fetchData };
}

// 批量获取所有账号的订阅信息
export function useAllAccountsCredits() {
  const { accounts } = useAccounts();
  const [creditsData, setCreditsData] = useState<
    Map<
      string,
      {
        loginInfo: LoginInfo | null;
        subscriptions: Subscription[];
        loading: boolean;
        error: string | null;
      }
    >
  >(new Map());

  const fetchAll = useCallback(async () => {
    const newData = new Map<
      string,
      {
        loginInfo: LoginInfo | null;
        subscriptions: Subscription[];
        loading: boolean;
        error: string | null;
      }
    >();

    for (const account of accounts) {
      newData.set(account.id, {
        loginInfo: null,
        subscriptions: [],
        loading: true,
        error: null,
      });
    }
    setCreditsData(new Map(newData));

    await Promise.all(
      accounts.map(async (account) => {
        try {
          const client = new Code88Client({ authToken: account.token });
          const queries = new Code88Queries(client);
          const [loginResult, subsResult] = await Promise.all([
            queries.getLoginInfo(),
            queries.getSubscriptions(),
          ]);

          newData.set(account.id, {
            loginInfo: loginResult.success ? loginResult.data : null,
            subscriptions: subsResult.success ? subsResult.data : [],
            loading: false,
            error: loginResult.success ? null : loginResult.message || "Failed",
          });
        } catch (err) {
          newData.set(account.id, {
            loginInfo: null,
            subscriptions: [],
            loading: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      })
    );

    setCreditsData(new Map(newData));
  }, [accounts]);

  useState(() => {
    if (accounts.length > 0) {
      fetchAll();
    }
  });

  return { creditsData, refetch: fetchAll };
}
