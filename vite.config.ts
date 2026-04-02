import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'logo.svg'],
      manifest: {
        name: 'TealTiger Playground',
        short_name: 'TealTiger',
        description: 'Interactive policy testing environment for TealTiger',
        theme_color: '#0EA5E9',
        background_color: '#1E1E1E',
        display: 'standalone',
        icons: [
          {
            src: 'logo-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'logo-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'monaco-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    // Disable sourcemaps in production to reduce bundle size
    sourcemap: false,
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
      },
      format: {
        comments: false,
      },
    },
    // Chunk size warning at 300KB (aggressive for free tier)
    chunkSizeWarningLimit: 300,
    // Asset inlining threshold: inline assets < 4KB as base64
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        // Optimized manual chunks for better caching and smaller initial load
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'monaco-editor': ['monaco-editor'],
          'router': ['react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'pdf': ['jspdf'],
          'utils': ['lz-string', 'zustand', 'clsx'],
          'markdown': ['react-markdown'],
        },
        // Use hashed filenames for long-term caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
      // Tree-shake aggressively
      treeshake: {
        preset: 'recommended',
      },
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
  },
  optimizeDeps: {
    include: ['monaco-editor'],
  },
});
