import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import typegpu from 'unplugin-typegpu/vite'
import path from 'path'
import fs from 'fs'

// Serves the local images/ directory during dev without copying them to publicDir.
function serveLocalImages() {
  return {
    name: 'local-images',
    configureServer(server) {
      server.middlewares.use('/images', (req, res, next) => {
        const filePath = path.resolve('./images' + (req.url || ''))
        try {
          const stat = fs.statSync(filePath)
          if (!stat.isFile()) { next(); return }
          const ext = path.extname(filePath).toLowerCase()
          const types = { '.webp': 'image/webp', '.png': 'image/png' }
          res.setHeader('Content-Type', types[ext] || 'application/octet-stream')
          res.setHeader('Cache-Control', 'public, max-age=86400')
          fs.createReadStream(filePath).pipe(res)
        } catch {
          next()
        }
      })
    }
  }
}

/**
 * Where the site is served from, and what it is served as.
 *
 * Project pages put it under /Write-With-Nature/; a custom domain serves it
 * from the root. Everything else already follows this: src reads it through
 * import.meta.env.BASE_URL, the manifest uses relative URLs that resolve
 * against its own location, and the service worker caches by './'. These two
 * are the only values that have to be told.
 *
 * To move to a domain, set both in the deploy workflow and add a CNAME file
 * to public/ holding the hostname:
 *
 *   BASE_PATH=/  SITE_URL=https://wwn.example.com  npm run build
 */
const BASE_PATH = process.env.BASE_PATH ?? '/Write-With-Nature/'
const SITE_URL = process.env.SITE_URL ?? 'https://vegamorningstar.github.io/Write-With-Nature'

/**
 * Link previews are fetched by scrapers with no page context, so og:image has
 * to be absolute — the one URL on the page that cannot be relative, and so the
 * one that has to be substituted at build time.
 */
function siteUrl() {
  return {
    name: 'site-url',
    transformIndexHtml(html) {
      return html.replaceAll('%SITE_URL%', SITE_URL)
    },
  }
}

export default defineConfig({
  plugins: [typegpu({ include: [/\.m?[jt]sx?/] }), react(), serveLocalImages(), siteUrl()],
  base: BASE_PATH,
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 8192,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        }
      }
    }
  }
})
