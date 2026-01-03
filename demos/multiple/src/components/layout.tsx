import { Link, useLocation } from '@tanstack/react-router'
import { Activity, Home, Settings } from 'lucide-react'
import { useAccounts } from '@/lib/use-sdk'
import { useRelayPulseSettings } from '@/lib/service-context'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AccountAvatar } from '@/components/ui/account-avatar'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { accounts } = useAccounts()
  const { enabled: relayPulseEnabled } = useRelayPulseSettings()
  const location = useLocation()
  const logoUrl = `${import.meta.env.BASE_URL}logo.webp`

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b px-4 py-3 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
            <img
              src={logoUrl}
              alt="88code"
              width={28}
              height={28}
              className="rounded-none"
            />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <h1 className="text-base leading-none font-semibold">
                88Code Manager
              </h1>
              <p className="text-muted-foreground mt-1 truncate text-xs">
                多账号管理面板
              </p>
            </div>
            <div className="ml-auto flex items-center group-data-[collapsible=icon]:ml-0">
              <SidebarTrigger />
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link to="/" />}
                    isActive={location.pathname === '/'}
                  >
                    <Home className="size-4" />
                    <span>综合面板</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {relayPulseEnabled && (
            <SidebarGroup>
              <SidebarGroupLabel>扩展</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<Link to="/status" />}
                      isActive={location.pathname === '/status'}
                    >
                      <Activity className="size-4" />
                      <span>服务状态</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {accounts.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>账号</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {accounts.map((account) => (
                    <SidebarMenuItem key={account.id}>
                      <SidebarMenuButton
                        render={
                          <Link
                            to="/account/$accountId"
                            params={{ accountId: account.id }}
                          />
                        }
                        isActive={
                          location.pathname === `/account/${account.id}`
                        }
                        tooltip={account.name}
                      >
                        <AccountAvatar
                          seed={account.id}
                          name={account.name}
                          className="size-4"
                        />
                        <span className="truncate">{account.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="border-t">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link to="/settings" />}
                isActive={location.pathname === '/settings'}
              >
                <Settings className="size-4" />
                <span>设置</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* 移动端顶部栏 */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger />
          <img
            src={logoUrl}
            alt="88code"
            width={20}
            height={20}
            className="rounded-none"
          />
          <span className="text-sm font-semibold">88Code Manager</span>
        </header>

        {/* 主内容区 */}
        <ScrollArea className="flex-1">{children}</ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  )
}
