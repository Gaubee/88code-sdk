import { Link, useLocation } from "@tanstack/react-router";
import { Home, Settings, User } from "lucide-react";
import { useAccounts } from "@/lib/use-sdk";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { accounts } = useAccounts();
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      {/* 侧边导航 */}
      <aside className="w-56 border-r bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-4 border-b">
          <h1 className="font-semibold text-lg">88Code Manager</h1>
          <p className="text-xs text-muted-foreground">多账号管理面板</p>
        </div>

        <nav className="flex-1 p-2">
          {/* 首页 */}
          <Link to="/">
            <Button
              variant={location.pathname === "/" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2 mb-1"
            >
              <Home className="size-4" />
              综合面板
            </Button>
          </Link>

          {/* 账号列表 */}
          {accounts.length > 0 && (
            <div className="mt-4">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                账号
              </div>
              {accounts.map((account) => (
                <Link
                  key={account.id}
                  to="/account/$accountId"
                  params={{ accountId: account.id }}
                >
                  <Button
                    variant={
                      location.pathname === `/account/${account.id}`
                        ? "secondary"
                        : "ghost"
                    }
                    className="w-full justify-start gap-2 mb-1"
                  >
                    <User className="size-4" />
                    <span className="truncate">{account.name}</span>
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* 设置 */}
        <div className="p-2 border-t">
          <Link to="/settings">
            <Button
              variant={location.pathname === "/settings" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
            >
              <Settings className="size-4" />
              账号设置
            </Button>
          </Link>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 bg-background overflow-auto">{children}</main>
    </div>
  );
}
