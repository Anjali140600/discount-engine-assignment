import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import parseRuleHandler from './api/parse-rule.js'

function localRuleApi() {
  return {
    name: 'local-rule-api',
    configureServer(server) {
      server.middlewares.use('/api/parse-rule', (request, response) => {
        let rawBody = ''
        request.on('data', (chunk) => { rawBody += chunk })
        request.on('end', async () => {
          request.body = rawBody
          const adapter = {
            statusCode: 200,
            setHeader: (name, value) => response.setHeader(name, value),
            status(code) {
              this.statusCode = code
              return this
            },
            json(payload) {
              response.statusCode = this.statusCode
              response.setHeader('Content-Type', 'application/json')
              response.end(JSON.stringify(payload))
              return this
            },
          }

          try {
            await parseRuleHandler(request, adapter)
          } catch {
            response.statusCode = 500
            response.end(JSON.stringify({ error: 'Local rule endpoint failed.' }))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Vite does not expose this server-only key to browser code.
  const serverEnv = loadEnv(mode, process.cwd(), '')
  if (serverEnv.GEMINI_API_KEY) process.env.GEMINI_API_KEY = serverEnv.GEMINI_API_KEY

  return {
    plugins: [react(), localRuleApi()],
    build: {
      // The optional PDF reader is intentionally lazy-loaded as its own chunk.
      chunkSizeWarningLimit: 600,
    },
  }
})
