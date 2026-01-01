import { HeadContent, Scripts, createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { Layout } from "@/components/layout";
import { ServiceProvider } from "@/lib/service-context";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  ssr: false,
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "88Code Manager - 多账号管理面板",
      },
    ],
    links: [
      {
        rel: "icon",
        href: `${import.meta.env.BASE_URL}logo.webp`,
        type: "image/webp",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
  component: RootComponent,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ServiceProvider>
      <Layout>
        <Outlet />
      </Layout>
    </ServiceProvider>
  );
}
