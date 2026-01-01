import { createRouter, createHashHistory, createMemoryHistory } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
export const getRouter = () => {
  // Use hash history in browser, memory history for SSR/prerender
  const history = typeof window !== 'undefined'
    ? createHashHistory()
    : createMemoryHistory({ initialEntries: ['/'] })

  const router = createRouter({
    routeTree,
    history,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  })

  return router
}
