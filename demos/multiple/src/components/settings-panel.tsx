import { useState } from "react";
import { Plus, Trash2, Eye, EyeOff, Edit2, Check, X, Server } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useAccounts } from "@/lib/use-sdk";
import { DEFAULT_API_HOSTS, DEFAULT_API_HOST } from "@/lib/accounts-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const CUSTOM_HOST_VALUE = "__custom__";

export function SettingsPanel() {
  const { accounts, addAccount, removeAccount, updateAccount } = useAccounts();
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">账号设置</h1>
        <p className="text-muted-foreground">
          管理您的 88Code 账号，添加或删除账号以便统一管理
        </p>
      </div>

      {/* 添加新账号 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">添加新账号</CardTitle>
          <CardDescription>
            输入账号名称和 Auth Token 添加新的 88Code 账号
          </CardDescription>
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
    </div>
  );
}
