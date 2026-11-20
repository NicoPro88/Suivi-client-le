import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Nom affiché de l'application (modifiable ici et dans src/config.ts).
const APP_NAME = 'Fil Rouge'

export default defineConfig(({ mode }) => ({
  // "demo" : build autonome sans Firebase (données sur l'appareil), servi depuis n'importe quel dossier.
  base: mode === 'demo' ? './' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      disable: mode === 'demo',
      includeAssets: ['icon.svg'],
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
        description: 'Suivi des clients, rendez-vous et chantiers',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#c62828',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: 'node',
  },
}))
