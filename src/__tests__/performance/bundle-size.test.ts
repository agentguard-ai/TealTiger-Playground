/**
 * Bundle size verification tests for Vercel free tier optimization.
 *
 * These tests validate that the Vite build configuration produces
 * optimized output suitable for Vercel free tier (100GB bandwidth/month).
 *
 * Validates: Requirements 1.6
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read the vite config source to validate optimization settings
const viteConfigPath = resolve(__dirname, '../../../vite.config.ts');
const viteConfigSource = readFileSync(viteConfigPath, 'utf-8');

// Read package.json for script validation
const packageJsonPath = resolve(__dirname, '../../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

describe('Vercel Free Tier Bundle Optimization', () => {
  describe('Vite build configuration', () => {
    it('should disable sourcemaps in production to reduce bundle size', () => {
      expect(viteConfigSource).toContain("sourcemap: false");
    });

    it('should use terser minification with console stripping', () => {
      expect(viteConfigSource).toContain("minify: 'terser'");
      expect(viteConfigSource).toContain('drop_console: true');
      expect(viteConfigSource).toContain('drop_debugger: true');
    });

    it('should configure chunk size warning limit', () => {
      expect(viteConfigSource).toContain('chunkSizeWarningLimit');
    });

    it('should enable CSS code splitting', () => {
      expect(viteConfigSource).toContain('cssCodeSplit: true');
    });

    it('should configure asset inlining threshold', () => {
      expect(viteConfigSource).toContain('assetsInlineLimit');
    });
  });

  describe('Manual chunk splitting', () => {
    it('should split react vendor into its own chunk', () => {
      expect(viteConfigSource).toContain("'react-vendor'");
      expect(viteConfigSource).toMatch(/react-vendor.*react.*react-dom/s);
    });

    it('should split monaco-editor into its own chunk', () => {
      expect(viteConfigSource).toContain("'monaco-editor'");
    });

    it('should split supabase into its own chunk for deferred loading', () => {
      expect(viteConfigSource).toContain("'supabase'");
      expect(viteConfigSource).toContain('@supabase/supabase-js');
    });

    it('should split jspdf into its own chunk for on-demand loading', () => {
      expect(viteConfigSource).toContain("'pdf'");
      expect(viteConfigSource).toContain('jspdf');
    });

    it('should split router into its own chunk', () => {
      expect(viteConfigSource).toContain("'router'");
      expect(viteConfigSource).toContain('react-router-dom');
    });
  });

  describe('Tree shaking configuration', () => {
    it('should enable aggressive tree shaking', () => {
      expect(viteConfigSource).toContain('treeshake');
      expect(viteConfigSource).toContain("preset: 'recommended'");
    });
  });

  describe('Asset optimization', () => {
    it('should use hashed filenames for long-term caching', () => {
      expect(viteConfigSource).toContain('[hash]');
      expect(viteConfigSource).toContain('chunkFileNames');
      expect(viteConfigSource).toContain('entryFileNames');
      expect(viteConfigSource).toContain('assetFileNames');
    });
  });

  describe('Lazy loading', () => {
    it('should use lazy loading for enterprise pages', () => {
      const routerPath = resolve(__dirname, '../../Router.tsx');
      const routerSource = readFileSync(routerPath, 'utf-8');
      expect(routerSource).toContain('lazy(');
      expect(routerSource).toContain('Suspense');
    });
  });

  describe('Bundle analysis scripts', () => {
    it('should have a build:analyze script for bundle visualization', () => {
      expect(packageJson.scripts['build:analyze']).toBeDefined();
    });

    it('should have a build:size script for budget checking', () => {
      expect(packageJson.scripts['build:size']).toBeDefined();
      expect(packageJson.scripts['build:size']).toContain('check-bundle-size');
    });
  });

  describe('PWA and caching configuration', () => {
    it('should configure service worker for asset caching', () => {
      expect(viteConfigSource).toContain('VitePWA');
      expect(viteConfigSource).toContain('CacheFirst');
      expect(viteConfigSource).toContain('monaco-cache');
    });

    it('should cache CDN resources for offline/reduced bandwidth', () => {
      expect(viteConfigSource).toContain('jsdelivr');
      expect(viteConfigSource).toContain('maxAgeSeconds');
    });
  });
});
