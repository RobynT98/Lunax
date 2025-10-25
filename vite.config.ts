import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

// Respektera Pages-base (sätts i CI som VITE_BASE), annars "/"
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/pwa',
      filename: 'sw.ts',
      injectRegister: 'auto',
      registerType: 'prompt',
      devOptions: {
        enabled: true,
        suppressWarnings: true,
        type: 'module'
      },
      // Manifest ligger i /public (explicit)
      manifest: false,
      includeAssets: [
        'icons/favicon.svg',
        'icons/favicon.ico',
        'icons/apple-touch-icon.png',
        'icons/mask-icon.svg'
      ],
      workbox: {
        // relativ fallback funkar oavsett base i Pages
        navigateFallback: 'index.html'
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    strictPort: true
  },
  preview: {
    port: 4173,
    strictPort: true
  }
});