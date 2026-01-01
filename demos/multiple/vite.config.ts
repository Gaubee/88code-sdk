import { defineConfig, loadEnv } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const base = env.VITE_BASE ?? (mode === "production" ? "./" : "/")

  return {
    base,
    plugins: [
      devtools(),
      // this is the plugin that enables path aliases
      viteTsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      tailwindcss(),
      tanstackStart({
        spa: {
          enabled: true,
          maskPath: "/",
          prerender: {
            /**
             * 产出静态 `index.html`，用于 GitHub Pages SPA 部署（并可复制为 `404.html`）。
             *
             * - 产物路径：`/index` -> `index.html`
             * - 不 crawlLinks：保持 SPA shell 产物最小
             */
            outputPath: "/index",
          },
        },
      }),
      viteReact(),
    ],
  }
})

export default config
