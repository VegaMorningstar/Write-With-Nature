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

export default defineConfig({
  plugins: [typegpu({ include: [/\.m?[jt]sx?/] }), react(), serveLocalImages()],
  base: '/Write-With-Nature/',
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
