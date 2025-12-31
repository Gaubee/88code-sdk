import { useEffect, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  RefreshCw,
  CreditCard,
  User,
  AlertCircle,
  Loader2,
  Settings,
  ChevronRight,
  Wallet,
  Zap,
} from "lucide-react";
import { Code88Client, Code88Queries, createMutations } from "@gaubee/88code-sdk";
import type { LoginInfo, Subscription, CodexFreeQuota } from "@gaubee/88code-sdk";
import { useAccounts } from "@/lib/use-sdk";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface AccountCredits {
  loginInfo: LoginInfo | null;
  subscriptions: Subscription[];
  codexFree: CodexFreeQuota | null;
  loading: boolean;
  error: string | null;
}

export function Dashboard() {
  const { accounts } = useAccounts();
  const [creditsData, setCreditsData] = useState<Map<string, AccountCredits>>(
    new Map()
  );
  const [resetting, setResetting] = useState<{
    accountId: string;
    subId: number;
  } | null>(null);

  const fetchAllCredits = useCallback(async () => {
    if (accounts.length === 0) return;

    // 初始化 loading 状态
    const initData = new Map<string, AccountCredits>();
    for (const acc of accounts) {
      initData.set(acc.id, {
        loginInfo: null,
        subscriptions: [],
        codexFree: null,
        loading: true,
        error: null,
      });
    }
    setCreditsData(new Map(initData));

    // 并行获取所有账号数据
    await Promise.all(
      accounts.map(async (acc) => {
        try {
          const client = new Code88Client({ authToken: acc.token, baseUrl: acc.apiHost });
          const queries = new Code88Queries(client);
          const [loginResult, subsResult, codexFreeResult] = await Promise.all([
            queries.getLoginInfo(),
            queries.getSubscriptions(),
            queries.getCodexFreeQuota(),
          ]);

          setCreditsData((prev) => {
            const next = new Map(prev);
            next.set(acc.id, {
              loginInfo: loginResult.success ? loginResult.data : null,
              subscriptions: subsResult.success ? subsResult.data : [],
              codexFree: codexFreeResult.success && codexFreeResult.data.enabled ? codexFreeResult.data : null,
              loading: false,
              error: loginResult.success
                ? null
                : loginResult.message || "获取失败",
            });
            return next;
          });
        } catch (err) {
          setCreditsData((prev) => {
            const next = new Map(prev);
            next.set(acc.id, {
              loginInfo: null,
              subscriptions: [],
              codexFree: null,
              loading: false,
              error: err instanceof Error ? err.message : "获取失败",
            });
            return next;
          });
        }
      })
    );
  }, [accounts]);

  useEffect(() => {
    fetchAllCredits();
  }, [fetchAllCredits]);

  const handleResetCredits = async (
    accountId: string,
    token: string,
    apiHost: string | undefined,
    subscriptionId: number
  ) => {
    setResetting({ accountId, subId: subscriptionId });
    try {
      const client = new Code88Client({ authToken: token, baseUrl: apiHost });
      const mutations = createMutations(client, "I_UNDERSTAND_THE_RISKS");
      const result = await mutations.resetCredits(subscriptionId);

      if (result.success) {
        // 刷新该账号数据
        const queries = new Code88Queries(client);
        const subsResult = await queries.getSubscriptions();
        setCreditsData((prev) => {
          const next = new Map(prev);
          const current = next.get(accountId);
          if (current) {
            next.set(accountId, {
              ...current,
              subscriptions: subsResult.success ? subsResult.data : [],
            });
          }
          return next;
        });
      } else {
        alert(result.message || "重置失败");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "重置失败");
    } finally {
      setResetting(null);
    }
  };

  // 计算总体统计
  const totalStats = {
    totalCredits: 0,
    usedCredits: 0,
    remainingCredits: 0,
    activeSubscriptions: 0,
  };

  for (const [, data] of creditsData) {
    if (!data.loading && !data.error) {
      for (const sub of data.subscriptions) {
        totalStats.totalCredits += sub.subscriptionPlan?.creditLimit ?? 0;
        totalStats.remainingCredits += sub.currentCredits ?? 0;
        totalStats.activeSubscriptions++;
      }
      // 将 Codex Free 也纳入统计
      if (data.codexFree) {
        totalStats.totalCredits += data.codexFree.dailyQuota;
        totalStats.remainingCredits += data.codexFree.remainingQuota;
        totalStats.activeSubscriptions++;
      }
    }
  }
  totalStats.usedCredits = totalStats.totalCredits - totalStats.remainingCredits;

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="text-center">
          <Wallet className="size-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">还没有添加账号</h2>
          <p className="text-muted-foreground">
            添加您的 88Code 账号以开始管理
          </p>
        </div>
        <Link to="/settings">
          <Button>
            <Settings className="size-4 mr-2" />
            添加账号
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">综合面板</h1>
          <p className="text-muted-foreground">
            管理 {accounts.length} 个 88Code 账号
          </p>
        </div>
        <Button variant="outline" onClick={fetchAllCredits}>
          <RefreshCw className="size-4 mr-1" />
          刷新全部
        </Button>
      </div>

      {/* 总体统计 */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card size="sm">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">账号总数</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {totalStats.activeSubscriptions}
            </div>
            <p className="text-xs text-muted-foreground">活跃订阅</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              ${totalStats.totalCredits.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">总额度</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              ${totalStats.remainingCredits.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">剩余额度</p>
          </CardContent>
        </Card>
      </div>

      {/* 账号列表 */}
      <div className="space-y-4">
        {accounts.map((account) => {
          const data = creditsData.get(account.id);
          const isLoading = data?.loading ?? true;
          const error = data?.error;
          const subscriptions = data?.subscriptions ?? [];
          const loginInfo = data?.loginInfo;

          return (
            <Card key={account.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="size-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{account.name}</CardTitle>
                      {loginInfo && (
                        <CardDescription>
                          {loginInfo.actualName} ({loginInfo.email})
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <Link
                    to="/account/$accountId"
                    params={{ accountId: account.id }}
                  >
                    <Button variant="ghost" size="sm">
                      详情
                      <ChevronRight className="size-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : error ? (
                  <div className="flex items-center gap-2 text-destructive py-2">
                    <AlertCircle className="size-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                ) : subscriptions.length === 0 && !data?.codexFree ? (
                  <p className="text-muted-foreground text-sm py-2">
                    暂无活跃订阅
                  </p>
                ) : (
                  <div className="space-y-3">
                    {/* Codex Free 卡片 - 紫色主题 */}
                    {data?.codexFree && (
                      <div className="p-3 border border-purple-500/30 rounded-lg bg-purple-500/5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Zap className="size-4 text-purple-500" />
                            <span className="font-medium text-sm">
                              Codex Free 每日免费额度
                            </span>
                            <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-600">
                              {data.codexFree.subscriptionLevel}
                            </Badge>
                          </div>
                        </div>
                        {/* 进度条 - 按剩余渲染 */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              剩余: ${data.codexFree.remainingQuota.toFixed(2)}
                            </span>
                            <span>
                              总额度: ${data.codexFree.dailyQuota}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 transition-all"
                              style={{
                                width: `${Math.min(data.codexFree.dailyQuota > 0 ? (data.codexFree.remainingQuota / data.codexFree.dailyQuota) * 100 : 0, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {/* 常规订阅卡片 */}
                    {subscriptions.map((sub) => {
                      const creditLimit = sub.subscriptionPlan?.creditLimit ?? 0;
                      const currentCredits = sub.currentCredits ?? 0;
                      // 按剩余渲染：剩余越多越满
                      const remainingPercent =
                        creditLimit > 0 ? (currentCredits / creditLimit) * 100 : 0;
                      const isResetting =
                        resetting?.accountId === account.id &&
                        resetting?.subId === sub.id;

                      return (
                        <div
                          key={sub.id}
                          className="p-3 border rounded-lg bg-muted/30"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CreditCard className="size-4 text-muted-foreground" />
                              <span className="font-medium text-sm">
                                {sub.subscriptionPlanName}
                              </span>
                              <Badge variant="default" className="text-xs">
                                活跃中
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {sub.remainingDays}天
                              </Badge>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger
                                className={buttonVariants({
                                  size: "xs",
                                })}
                                disabled={isResetting}
                              >
                                {isResetting ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="size-3" />
                                )}
                                <span className="ml-1">重置</span>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    确认重置额度？
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    将重置 {account.name} 的 "
                                    {sub.subscriptionPlanName}"
                                    额度到初始值。每日重置次数有限制。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleResetCredits(
                                        account.id,
                                        account.token,
                                        account.apiHost,
                                        sub.id
                                      )
                                    }
                                  >
                                    确认重置
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>

                          {/* 进度条 - 按剩余渲染 */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>
                                剩余: ${currentCredits.toFixed(2)}
                              </span>
                              <span>
                                总额度: ${creditLimit}
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{
                                  width: `${Math.min(remainingPercent, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
