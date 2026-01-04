/**
 * 账号存储管理
 * 使用 localStorage 存储多个 88Code 账号
 */

export const DEFAULT_API_HOSTS = [
  { value: 'https://88code.ai', label: '88code.ai (默认)' },
  { value: 'https://88code.org', label: '88code.org' },
] as const

export const DEFAULT_API_HOST = DEFAULT_API_HOSTS[0].value

export interface Account {
  id: string
  /** 用于生成稳定的 avatar，来自 loginInfo.employeeId */
  employeeId?: number
  name: string
  token: string
  apiHost: string
  createdAt: number
}

const STORAGE_KEY = '88code-accounts'

export function getAccounts(): Account[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []
  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

export function saveAccounts(accounts: Account[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
}

export function addAccount(
  name: string,
  token: string,
  apiHost: string = DEFAULT_API_HOST,
  employeeId?: number,
): Account {
  const accounts = getAccounts()
  const newAccount: Account = {
    id: crypto.randomUUID(),
    employeeId,
    name,
    token,
    apiHost,
    createdAt: Date.now(),
  }
  accounts.push(newAccount)
  saveAccounts(accounts)
  return newAccount
}

export function removeAccount(id: string): void {
  const accounts = getAccounts().filter((a) => a.id !== id)
  saveAccounts(accounts)
}

export function updateAccount(
  id: string,
  updates: Partial<Pick<Account, 'name' | 'token' | 'apiHost' | 'employeeId'>>,
): void {
  const accounts = getAccounts()
  const index = accounts.findIndex((a) => a.id === id)
  if (index !== -1) {
    accounts[index] = { ...accounts[index], ...updates }
    saveAccounts(accounts)
  }
}

export function getAccountById(id: string): Account | undefined {
  return getAccounts().find((a) => a.id === id)
}
