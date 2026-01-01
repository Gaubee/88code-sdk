import { useState } from "react";
import { Plus, Trash2, Eye, EyeOff, Edit2, Check, X, Server, Timer, Activity, Terminal, Copy, Download, Upload, FileJson } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useAccounts, useAutoRefresh } from "@/lib/use-sdk";
import type { Account } from "@/lib/accounts-store";
import { useRelayPulseSettings } from "@/lib/service-context";
import { REFRESH_INTERVALS, RELAYPULSE_DEFAULT_URL } from "@/lib/settings-store";
import { DEFAULT_API_HOSTS, DEFAULT_API_HOST } from "@/lib/accounts-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

const CUSTOM_HOST_VALUE = "__custom__";

export function SettingsPanel() {
  const { accounts, addAccount, removeAccount, updateAccount } = useAccounts();
  const { enabled: autoRefreshEnabled, interval: autoRefreshInterval, toggle: toggleAutoRefresh, setInterval: setRefreshInterval } = useAutoRefresh();
  const { enabled: relayPulseEnabled, baseUrl: relayPulseBaseUrl, setEnabled: setRelayPulseEnabled, setBaseUrl: setRelayPulseBaseUrl } = useRelayPulseSettings();
  const [copied, setCopied] = useState(false);
  const [importExportDialogOpen, setImportExportDialogOpen] = useState(false);
  const [importExportText, setImportExportText] = useState("");
  const [importExportCopied, setImportExportCopied] = useState(false);

  const proxyCommand = "npx @gaubee/88code-sdk plugin RelayPulse";
  const copyCommand = async () => {
    await navigator.clipboard.writeText(proxyCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const [newName, setNewName] = useState("");
  const [newToken, setNewToken] = useState("");
  const [newApiHost, setNewApiHost] = useState<string>(DEFAULT_API_HOST);
  const [customApiHost, setCustomApiHost] = useState("");
  const [showTokens, setShowTokens] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editingHostId, setEditingHostId] = useState<string | null>(null);
  const [editApiHost, setEditApiHost] = useState("");
  const [editCustomApiHost, setEditCustomApiHost] = useState("");

  const getEffectiveApiHost = (host: string, custom: string) => {
    if (host === CUSTOM_HOST_VALUE) {
      return custom.trim() || DEFAULT_API_HOST;
    }
    return host;
  };

  const handleAdd = () => {
    if (!newName.trim() || !newToken.trim()) return;
    const apiHost = getEffectiveApiHost(newApiHost, customApiHost);
    addAccount(newName.trim(), newToken.trim(), apiHost);
    setNewName("");
    setNewToken("");
    setNewApiHost(DEFAULT_API_HOST);
    setCustomApiHost("");
  };

  const isKnownHost = (host: string) =>
    DEFAULT_API_HOSTS.some((h) => h.value === host);

  const startEditingHost = (id: string, currentHost: string) => {
    setEditingHostId(id);
    if (isKnownHost(currentHost)) {
      setEditApiHost(currentHost);
      setEditCustomApiHost("");
    } else {
      setEditApiHost(CUSTOM_HOST_VALUE);
      setEditCustomApiHost(currentHost);
    }
  };

  const saveHostEdit = (id: string) => {
    const apiHost = getEffectiveApiHost(editApiHost, editCustomApiHost);
    updateAccount(id, { apiHost });
    setEditingHostId(null);
    setEditApiHost("");
    setEditCustomApiHost("");
  };

  const cancelHostEdit = () => {
    setEditingHostId(null);
    setEditApiHost("");
    setEditCustomApiHost("");
  };

  const toggleTokenVisibility = (id: string) => {
    setShowTokens((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const saveEdit = (id: string) => {
    if (editName.trim()) {
      updateAccount(id, { name: editName.trim() });
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const maskToken = (token: string) => {
    if (token.length <= 12) return "*".repeat(token.length);
    return token.slice(0, 6) + "..." + token.slice(-6);
  };

  const openImportExportDialog = () => {
    const exportData = accounts.map(({ name, token, apiHost }) => ({
      name,
      token,
      apiHost,
    }));
    setImportExportText(JSON.stringify(exportData, null, 2));
    setImportExportCopied(false);
    setImportExportDialogOpen(true);
  };

  const copyImportExportText = async () => {
    await navigator.clipboard.writeText(importExportText);
    setImportExportCopied(true);
    setTimeout(() => setImportExportCopied(false), 2000);
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importExportText) as Array<{ name: string; token: string; apiHost?: string }>;
      if (!Array.isArray(data)) throw new Error("格式错误");
      let imported = 0;
      for (const item of data) {
        if (item.name && item.token) {
          addAccount(item.name, item.token, item.apiHost || DEFAULT_API_HOST);
          imported++;
        }
      }
      alert(`成功导入 ${imported} 个账号`);
      setImportExportDialogOpen(false);
    } catch (err) {
      alert("导入失败：" + (err instanceof Error ? err.message : "JSON 格式错误"));
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-muted-foreground">
          管理您的 88Code 账号，添加或删除账号以便统一管理 · v0.1.0
        </p>
      </div>

      {/* 全局设置 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="size-4" />
            全局设置
          </CardTitle>
          <CardDescription>
            配置自动刷新和其他全局选项
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 自动刷新开关 */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-refresh-global" className="text-sm font-medium">
                  自动刷新
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  自动刷新所有数据
                </p>
              </div>
              <Switch
                id="auto-refresh-global"
                checked={autoRefreshEnabled}
                onCheckedChange={toggleAutoRefresh}
              />
            </div>
            {/* 刷新间隔 */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">
                  刷新间隔
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  数据自动刷新的时间间隔
                </p>
              </div>
              <Select
                value={String(autoRefreshInterval)}
                onValueChange={(v) => v && setRefreshInterval(Number(v))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REFRESH_INTERVALS.map((interval) => (
                    <SelectItem key={interval.value} value={String(interval.value)}>
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RelayPulse 服务状态 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="size-4" />
            RelayPulse 服务状态
          </CardTitle>
          <CardDescription>
            基于 RelayPulse 的公开探测数据，查看 88Code API 服务实时可用性
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 启用开关 */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="relaypulse-enabled" className="text-sm font-medium">
                  启用服务状态监控
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  在仪表盘显示 API 服务可用性状态
                </p>
              </div>
              <Switch
                id="relaypulse-enabled"
                checked={relayPulseEnabled}
                onCheckedChange={setRelayPulseEnabled}
              />
            </div>

            {/* 本地代理说明 */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                <Terminal className="size-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-1">本地代理模式</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    由于浏览器跨域限制，需要启动本地代理服务来获取 RelayPulse 数据。
                    在终端运行以下命令：
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-background rounded px-3 py-2 text-xs font-mono border">
                      {proxyCommand}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyCommand}
                      className="shrink-0"
                    >
                      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    代理启动后会显示本地地址，将地址填入下方配置
                  </p>
                </div>
              </div>
            </div>

            {/* 自定义地址 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                API 地址
              </Label>
              <Input
                placeholder={RELAYPULSE_DEFAULT_URL}
                value={relayPulseBaseUrl}
                onChange={(e) => setRelayPulseBaseUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                留空使用默认地址 ({RELAYPULSE_DEFAULT_URL})，或填入本地代理地址 (如 http://localhost:3000)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 添加新账号 */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base">添加新账号</CardTitle>
            <CardDescription>
              输入账号名称和 Auth Token 添加新的 88Code 账号
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={openImportExportDialog}>
            <FileJson className="size-4 mr-1" />
            导入/导出
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr_1fr_auto]">
            <div>
              <Label htmlFor="name" className="text-xs mb-1 block">
                账号名称
              </Label>
              <Input
                id="name"
                placeholder="例如：主账号"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="token" className="text-xs mb-1 block">
                Auth Token
              </Label>
              <Input
                id="token"
                type="password"
                placeholder="从 88code.ai 获取的 authToken"
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">API Host</Label>
              <Select value={newApiHost} onValueChange={(v) => v && setNewApiHost(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_API_HOSTS.map((host) => (
                    <SelectItem key={host.value} value={host.value}>
                      {host.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_HOST_VALUE}>自定义...</SelectItem>
                </SelectContent>
              </Select>
              {newApiHost === CUSTOM_HOST_VALUE && (
                <Input
                  className="mt-2"
                  placeholder="https://..."
                  value={customApiHost}
                  onChange={(e) => setCustomApiHost(e.target.value)}
                />
              )}
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAdd}
                disabled={!newName.trim() || !newToken.trim()}
              >
                <Plus className="size-4 mr-1" />
                添加
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            获取方式：登录 88code.ai → 打开浏览器开发者工具 (F12) → Application
            → Local Storage → 找到 authToken
          </p>
        </CardContent>
      </Card>

      {/* 已有账号列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            已添加账号 ({accounts.length})
          </CardTitle>
          <CardDescription>管理已添加的 88Code 账号</CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              暂无账号，请添加您的第一个 88Code 账号
            </p>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  {/* 名称 */}
                  <div className="flex-1 min-w-0">
                    {editingId === account.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-7"
                          autoFocus
                        />
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => saveEdit(account.id)}
                        >
                          <Check className="size-3" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={cancelEdit}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {account.name}
                        </span>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => startEditing(account.id, account.name)}
                        >
                          <Edit2 className="size-3" />
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs text-muted-foreground font-mono">
                        {showTokens.has(account.id)
                          ? account.token
                          : maskToken(account.token)}
                      </code>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => toggleTokenVisibility(account.id)}
                      >
                        {showTokens.has(account.id) ? (
                          <EyeOff className="size-3" />
                        ) : (
                          <Eye className="size-3" />
                        )}
                      </Button>
                    </div>
                    {/* API Host */}
                    {editingHostId === account.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Select value={editApiHost} onValueChange={(v) => v && setEditApiHost(v)}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DEFAULT_API_HOSTS.map((host) => (
                              <SelectItem key={host.value} value={host.value}>
                                {host.label}
                              </SelectItem>
                            ))}
                            <SelectItem value={CUSTOM_HOST_VALUE}>自定义...</SelectItem>
                          </SelectContent>
                        </Select>
                        {editApiHost === CUSTOM_HOST_VALUE && (
                          <Input
                            className="h-7 text-xs"
                            placeholder="https://..."
                            value={editCustomApiHost}
                            onChange={(e) => setEditCustomApiHost(e.target.value)}
                          />
                        )}
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => saveHostEdit(account.id)}
                        >
                          <Check className="size-3" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={cancelHostEdit}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <Server className="size-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {account.apiHost || DEFAULT_API_HOST}
                        </span>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => startEditingHost(account.id, account.apiHost || DEFAULT_API_HOST)}
                        >
                          <Edit2 className="size-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* 删除按钮 */}
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <button
                          className={buttonVariants({
                            size: "icon-sm",
                            variant: "destructive",
                          })}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认删除账号？</AlertDialogTitle>
                        <AlertDialogDescription>
                          将删除账号 "{account.name}"。此操作不可撤销。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => removeAccount(account.id)}
                        >
                          确认删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 导入/导出 Dialog */}
      <AlertDialog open={importExportDialogOpen} onOpenChange={setImportExportDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileJson className="size-5" />
              导入/导出账号
            </AlertDialogTitle>
            <AlertDialogDescription>
              复制下方 JSON 进行备份，或粘贴 JSON 数据导入账号
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <InputGroup className="h-auto">
              <InputGroupTextarea
                value={importExportText}
                onChange={(e) => setImportExportText(e.target.value)}
                rows={12}
                className="font-mono text-xs"
                placeholder='[{"name": "账号名", "token": "authToken", "apiHost": "https://88code.ai"}]'
              />
              <InputGroupAddon align="block-end" className="border-t justify-end">
                <InputGroupButton onClick={copyImportExportText}>
                  {importExportCopied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {importExportCopied ? "已复制" : "复制"}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <Button onClick={handleImport}>
              <Upload className="size-4 mr-1" />
              导入
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
