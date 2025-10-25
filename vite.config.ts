import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

// Vite + React + PWA (injectar vår egen service worker från src/pwa/sw.ts).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Vi använder egen SW-kod (injectManifest) för fin kontroll av cache-strategier.
      strategies: 'injectManifest',
      srcDir: 'src/pwa',
      filename: 'sw.ts',
      injectRegister: 'auto',
      registerType: 'prompt', // visar “ny version finns”-prompt när SW uppdateras
      devOptions: {
        enabled: true, // PWA funkar även i dev-läge
        suppressWarnings: true,
        type: 'module'
      },
      // Vi lägger själva manifestet i public/manifest.webmanifest (mer explicit).
      manifest: false,
      // Filer att kopiera rakt av till dist (ikoner m.m. i public/)
      includeAssets: [
        'icons/favicon.svg',
        'icons/favicon.ico',
        'icons/apple-touch-icon.png',
        'icons/mask-icon.svg'
      ],
      // Workbox fallback för navigering (SPA)
      workbox: {
        navigateFallback: '/index.html'
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