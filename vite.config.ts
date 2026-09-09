import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const base = mode === 'pages' ? '/MysteryCases/' : '/'

  return {
    base,
    plugins: [
      react(),
      VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MysteryCases',
        short_name: 'MysteryCases',
        description: 'Juego de deducción espacial e investigación.',
        lang: 'es',
        display: 'standalone',
        background_color: '#151718',
        theme_color: '#151718',
        start_url: base,
        scope: base,
        categories: ['games', 'entertainment'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
      },
      }),
    ],
  }
})
