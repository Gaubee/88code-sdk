import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Layout } from "@/components/layout";
import { ServiceProvider } from "@/lib/service-context";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <ServiceProvider>
      <Layout>
        <Outlet />
      </Layout>
    </ServiceProvider>
  );
}
