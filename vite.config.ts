import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, writeFileSync } from 'fs'
import { createDefaultSiteData } from './src/data/defaultSiteData'
import type { SiteData } from './src/types/siteData'

function siteDataDevApi(): Plugin {
  return {
    name: 'site-data-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/save-data', (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }

        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', () => {
          try {
            const data = JSON.parse(body) as SiteData
            writeFileSync('public/site-data.json', JSON.stringify(data, null, 2))
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, message: 'تم حفظ site-data.json' }))
          } catch {
            res.statusCode = 500
            res.end(JSON.stringify({ ok: false, error: 'فشل الحفظ' }))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    siteDataDevApi(),
    {
      name: 'generate-site-data',
      buildStart() {
        if (!existsSync('public/site-data.json')) {
          writeFileSync(
            'public/site-data.json',
            JSON.stringify(createDefaultSiteData(), null, 2)
          )
        }
      },
    },
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        bypass(req) {
          if (req.url === '/api/save-data') {
            return req.url
          }
        },
      },
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    reportCompressedSize: false,
    chunkSizeWarningLimit: 450,
    modulePreload: { polyfill: true },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router')) return 'router'
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('\\react\\')) {
              return 'react'
            }
            return 'vendor'
          }
          if (id.includes('/pages/admin/') || id.includes('\\pages\\admin\\')) {
            return 'admin'
          }
          // keep AI in page-level lazy chunks (avoids circular vendor chunks)
        },
      },
    },
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    legalComments: 'none',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
}))
