import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        manifest: {
          name: 'Amigable Cobro',
          short_name: 'Amigable',
          description: 'SaaS Multi-Negocio de Cobranza Inteligente',
          theme_color: '#6366F1',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
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
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      allowedHosts: process.env.VITE_ALLOWED_HOSTS
        ? process.env.VITE_ALLOWED_HOSTS.split(',')
        : ['amigablecobro.amacruxlab.com', 'cobro.amigable.app'],
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        // Routes handled by Express server (same container)
        '/api/gemini': {
          target: 'http://localhost:3003',
          changeOrigin: true,
        },
        '/api/upload-image': {
          target: 'http://localhost:3003',
          changeOrigin: true,
        },
        '/img': {
          target: 'http://localhost:3003',
          changeOrigin: true,
        },
        // Routes handled by Laravel API (Docker network)
        '/api': {
          target: 'http://app:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
