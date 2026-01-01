/**
 * 服务层 Context
 * 统一管理设置、账号和数据请求
 */

import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useSettings, type AppSettings } from "./settings-store";
import { queryClient } from "./query-client";
import {
  getAccounts,
  addAccount as addAccountToStorage,
  removeAccount as removeAccountFromStorage,
  updateAccount as updateAccountInStorage,
  getAccountById,
  type Account,
  DEFAULT_API_HOST,
} from "./accounts-store";
import { PollingManager } from "./services/polling-manager";
import { Code88Service } from "./services/code88-service";

// ===== Context 类型 =====

interface ServiceContextValue {
  // Query / Services
  pollingManager: PollingManager;
  code88: Code88Service;

  // 设置
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  toggleAutoRefresh: () => void;
  setRefreshInterval: (interval: number) => void;

  // 账号
  accounts: Account[];
  currentAccount: Account | null;
  setCurrentAccount: (account: Account | null) => void;
  addAccount: (name: string, token: string, apiHost?: string) => Account;
  removeAccount: (id: string) => void;
  updateAccount: (id: string, updates: Partial<Pick<Account, "name" | "token" | "apiHost">>) => void;
  refreshAccounts: () => void;
}

// ===== Context =====

const ServiceContext = React.createContext<ServiceContextValue | null>(null);

export function useService() {
  const context = React.useContext(ServiceContext);
  if (!context) {
    throw new Error("useService must be used within a ServiceProvider");
  }
  return context;
}

// ===== Provider =====

interface ServiceProviderProps {
  children: React.ReactNode;
}

export function ServiceProvider({ children }: ServiceProviderProps) {
  const {
    settings,
    updateSettings,
    toggleAutoRefresh,
    setRefreshInterval,
  } = useSettings();

  const code88 = React.useMemo(() => new Code88Service(), []);
  const pollingManager = React.useMemo(
    () =>
      new PollingManager(queryClient, {
        enabled: false,
        intervalMs: 5000,
      }),
    []
  );

  // 同步自动刷新配置到 PollingManager
  React.useEffect(() => {
    pollingManager.setConfig({
      enabled: settings.autoRefreshEnabled,
      intervalMs: settings.autoRefreshInterval,
    });
  }, [pollingManager, settings.autoRefreshEnabled, settings.autoRefreshInterval]);

  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [currentAccount, setCurrentAccount] = React.useState<Account | null>(null);

  // 初始化加载账号
  React.useEffect(() => {
    setAccounts(getAccounts());
  }, []);

  // 刷新账号列表
  const refreshAccounts = React.useCallback(() => {
    setAccounts(getAccounts());
  }, []);

  // 添加账号
  const addAccount = React.useCallback(
    (name: string, token: string, apiHost: string = DEFAULT_API_HOST): Account => {
      const newAccount = addAccountToStorage(name, token, apiHost);
      setAccounts(getAccounts());
      return newAccount;
    },
    []
  );

  // 删除账号
  const removeAccount = React.useCallback((id: string) => {
    removeAccountFromStorage(id);
    setAccounts(getAccounts());
    // 如果删除的是当前账号，清空选择
    setCurrentAccount((prev) => (prev?.id === id ? null : prev));
  }, []);

  // 更新账号
  const updateAccount = React.useCallback(
    (id: string, updates: Partial<Pick<Account, "name" | "token" | "apiHost">>) => {
      updateAccountInStorage(id, updates);
      setAccounts(getAccounts());
      // 更新当前账号（如果是同一个）
      setCurrentAccount((prev) => {
        if (prev?.id === id) {
          return getAccountById(id) ?? null;
        }
        return prev;
      });
    },
    []
  );

  const value = React.useMemo<ServiceContextValue>(
    () => ({
      pollingManager,
      code88,
      settings,
      updateSettings,
      toggleAutoRefresh,
      setRefreshInterval,
      accounts,
      currentAccount,
      setCurrentAccount,
      addAccount,
      removeAccount,
      updateAccount,
      refreshAccounts,
    }),
    [
      pollingManager,
      code88,
      settings,
      updateSettings,
      toggleAutoRefresh,
      setRefreshInterval,
      accounts,
      currentAccount,
      addAccount,
      removeAccount,
      updateAccount,
      refreshAccounts,
    ]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ServiceContext.Provider value={value}>
        {children}
      </ServiceContext.Provider>
    </QueryClientProvider>
  );
}

// ===== 便捷 Hooks =====

/** 只获取账号相关 */
export function useAccounts() {
  const { accounts, addAccount, removeAccount, updateAccount, refreshAccounts } = useService();
  return { accounts, addAccount, removeAccount, updateAccount, refreshAccounts };
}

/** 只获取当前账号 */
export function useCurrentAccount() {
  const { currentAccount, setCurrentAccount } = useService();
  return { currentAccount, setCurrentAccount };
}

/** 只获取自动刷新设置 */
export function useAutoRefresh() {
  const { settings, toggleAutoRefresh, setRefreshInterval } = useService();
  return {
    enabled: settings.autoRefreshEnabled,
    interval: settings.autoRefreshInterval,
    toggle: toggleAutoRefresh,
    setInterval: setRefreshInterval,
  };
}

/** 只获取 RelayPulse 设置 */
export function useRelayPulseSettings() {
  const { settings, updateSettings } = useService();
  return {
    enabled: settings.relayPulseEnabled,
    baseUrl: settings.relayPulseBaseUrl,
    setEnabled: (enabled: boolean) => updateSettings({ relayPulseEnabled: enabled }),
    setBaseUrl: (url: string) => updateSettings({ relayPulseBaseUrl: url }),
  };
}
