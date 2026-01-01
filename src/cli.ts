#!/usr/bin/env node

import { createServer } from 'node:http'
import { RELAYPULSE_BASE_URL } from './extensions/relaypulse.ts'

const PLUGINS = {
  RelayPulse: startRelayPulseProxy,
} as const

type PluginName = keyof typeof PLUGINS

function printUsage() {
  console.log(`
88Code SDK CLI

Usage:
  npx @gaubee/88code-sdk plugin <name> [options]

Available plugins:
  RelayPulse    Start a local CORS proxy for RelayPulse API

Options:
  --port, -p    Port to listen on (default: 0 = random available port)
  --help, -h    Show this help message

Examples:
  npx @gaubee/88code-sdk plugin RelayPulse
  npx @gaubee/88code-sdk plugin RelayPulse --port 3456
`)
}

function parseArgs(args: string[]): { port: number } {
  let port = 0
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--port' || arg === '-p') {
      const value = args[++i]
      if (value) {
        port = parseInt(value, 10)
        if (isNaN(port) || port < 0 || port > 65535) {
          console.error(`Invalid port: ${value}`)
          process.exit(1)
        }
      }
    }
  }
  return { port }
}

async function startRelayPulseProxy(options: { port: number }) {
  const server = createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`)

    // Only proxy /api/* paths
    if (!url.pathname.startsWith('/api/')) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          error: 'Not found. Proxy only handles /api/* paths.',
        }),
      )
      return
    }

    try {
      const targetUrl = new URL(url.pathname + url.search, RELAYPULSE_BASE_URL)
      const response = await fetch(targetUrl.toString(), {
        method: req.method,
        headers: {
          'User-Agent': '88code-sdk-proxy/1.0',
          Accept: 'application/json',
        },
      })

      const contentType =
        response.headers.get('content-type') || 'application/json'
      res.writeHead(response.status, { 'Content-Type': contentType })

      const body = await response.text()
      res.end(body)
    } catch (error) {
      console.error('Proxy error:', error)
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Proxy request failed' }))
    }
  })

  return new Promise<void>((resolve) => {
    server.listen(options.port, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : options.port
      console.log(
        `
╔══════════════════════════════════════════════════════════════╗
║                  RelayPulse Local Proxy                      ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Proxy server is running!                                    ║
║                                                              ║
║  Local URL:  http://127.0.0.1:$PORT                          ║
║  Target:     $RELAYPULSE_BASE_URL║
║                                                              ║
║  Copy this URL to 88Code Manager settings:                   ║
║  → Settings → RelayPulse → API Address                       ║
║                                                              ║
║  Press Ctrl+C to stop the server.                            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`
          .replace('$PORT', String(port).padEnd(5))
          .replace('$RELAYPULSE_BASE_URL', RELAYPULSE_BASE_URL.padEnd(48)),
      )
      resolve()
    })
  })
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage()
    process.exit(0)
  }

  const command = args[0]

  if (command !== 'plugin') {
    console.error(`Unknown command: ${command}`)
    printUsage()
    process.exit(1)
  }

  const pluginName = args[1] as PluginName | undefined

  if (!pluginName) {
    console.error('Please specify a plugin name.')
    printUsage()
    process.exit(1)
  }

  const pluginFn = PLUGINS[pluginName]

  if (!pluginFn) {
    console.error(`Unknown plugin: ${pluginName}`)
    console.error(`Available plugins: ${Object.keys(PLUGINS).join(', ')}`)
    process.exit(1)
  }

  const options = parseArgs(args.slice(2))

  try {
    await pluginFn(options)
  } catch (error) {
    console.error('Plugin error:', error)
    process.exit(1)
  }
}

main()
