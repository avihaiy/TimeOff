import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'המועצה הדתית עכו',
        short_name: 'המועצה הדתית עכו',
        description: 'בקשת חופשה - המועצה הדתית עכו',
        theme_color: '#2563eb',
        background_color: '#f9fafb',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('zustand') || id.includes('router')) return 'vendor';
            if (id.includes('@hebcal') || id.includes('date-fns') || id.includes('day-picker')) return 'calendar';
            return 'utils';
          }
        }
      }
    }
  }
})
