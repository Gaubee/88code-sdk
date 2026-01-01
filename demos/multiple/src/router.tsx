import { createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

type WindowWithAppBase = Window & { __APP_BASE__?: string }

function getRouterBasepath(): string {
  if (typeof window === "undefined") {
    const base = process.env.APP_BASE ?? ""
    if (!base) return ""
    return base.startsWith("/") ? base.replace(/\/$/, "") : `/${base.replace(/\/$/, "")}`
  }
  const base = (window as WindowWithAppBase).__APP_BASE__ ?? "/"
  // createRouter 的 basepath 不需要 trailing slash
  if (base === "/") return ""
  return base.endsWith("/") ? base.slice(0, -1) : base
}

// Create a new router instance
export const getRouter = () => {
  const router = createRouter({
    routeTree,
    basepath: getRouterBasepath(),
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  })

  return router
}
