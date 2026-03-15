/**
 * Bundle size checker for Vercel free tier optimization.
 *
 * Vercel free tier: 100GB bandwidth/month.
 * Target: keep total bundle under 1.5MB (gzipped ~400KB) so that
 * even with 200K page loads/month we stay well within limits.
 *
 * Budget:
 *   - Total bundle (all JS): ≤ 2MB uncompressed
 *   - Any single chunk:      ≤ 500KB uncompressed
 *   - Total CSS:             ≤ 200KB uncompressed
 *   - Entry chunk:           ≤ 300KB uncompressed
 */

import { readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';

const DIST_DIR = join(process.cwd(), 'dist');
const ASSETS_DIR = join(DIST_DIR, 'assets');

// Budget limits in bytes
const BUDGET = {
  totalJS: 2 * 1024 * 1024,       // 2MB
  singleChunk: 500 * 1024,         // 500KB
  totalCSS: 200 * 1024,            // 200KB
  entryChunk: 300 * 1024,          // 300KB
};

function collectFiles(dir, ext) {
  const results = [];
  try {
    const entries = readdirSync(dir, { recursive: true, withFileTypes: false });
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isFile() && extname(entry) === ext) {
          results.push({ path: entry, size: stat.size });
        }
      } catch {
        // skip
      }
    }
  } catch {
    // directory might not exist
  }
  return results;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function run() {
  console.log('\n📦 Bundle Size Report\n');
  console.log('='.repeat(60));

  // Collect JS files
  const jsFiles = collectFiles(ASSETS_DIR, '.js');
  const cssFiles = collectFiles(ASSETS_DIR, '.css');

  if (jsFiles.length === 0) {
    console.error('❌ No JS files found in dist/assets. Did the build succeed?');
    process.exit(1);
  }

  // Sort by size descending
  jsFiles.sort((a, b) => b.size - a.size);
  cssFiles.sort((a, b) => b.size - a.size);

  const totalJS = jsFiles.reduce((sum, f) => sum + f.size, 0);
  const totalCSS = cssFiles.reduce((sum, f) => sum + f.size, 0);

  // Print JS chunks
  console.log('\nJavaScript Chunks:');
  console.log('-'.repeat(60));
  for (const file of jsFiles) {
    const marker = file.size > BUDGET.singleChunk ? ' ⚠️  OVER BUDGET' : ' ✅';
    console.log(`  ${basename(file.path).padEnd(45)} ${formatSize(file.size).padStart(10)}${marker}`);
  }
  console.log('-'.repeat(60));
  console.log(`  ${'TOTAL JS'.padEnd(45)} ${formatSize(totalJS).padStart(10)}`);

  // Print CSS
  if (cssFiles.length > 0) {
    console.log('\nCSS Files:');
    console.log('-'.repeat(60));
    for (const file of cssFiles) {
      console.log(`  ${basename(file.path).padEnd(45)} ${formatSize(file.size).padStart(10)}`);
    }
    console.log('-'.repeat(60));
    console.log(`  ${'TOTAL CSS'.padEnd(45)} ${formatSize(totalCSS).padStart(10)}`);
  }

  // Budget checks
  console.log('\n📊 Budget Check:');
  console.log('-'.repeat(60));

  const violations = [];

  // Total JS
  const jsOk = totalJS <= BUDGET.totalJS;
  console.log(`  Total JS    ${formatSize(totalJS).padStart(10)} / ${formatSize(BUDGET.totalJS).padStart(10)}  ${jsOk ? '✅' : '❌'}`);
  if (!jsOk) violations.push(`Total JS (${formatSize(totalJS)}) exceeds budget (${formatSize(BUDGET.totalJS)})`);

  // Single chunk
  const largestChunk = jsFiles[0];
  const chunkOk = largestChunk.size <= BUDGET.singleChunk;
  console.log(`  Max Chunk   ${formatSize(largestChunk.size).padStart(10)} / ${formatSize(BUDGET.singleChunk).padStart(10)}  ${chunkOk ? '✅' : '❌'}`);
  if (!chunkOk) violations.push(`Chunk ${basename(largestChunk.path)} (${formatSize(largestChunk.size)}) exceeds budget (${formatSize(BUDGET.singleChunk)})`);

  // Total CSS
  const cssOk = totalCSS <= BUDGET.totalCSS;
  console.log(`  Total CSS   ${formatSize(totalCSS).padStart(10)} / ${formatSize(BUDGET.totalCSS).padStart(10)}  ${cssOk ? '✅' : '❌'}`);
  if (!cssOk) violations.push(`Total CSS (${formatSize(totalCSS)}) exceeds budget (${formatSize(BUDGET.totalCSS)})`);

  // Entry chunk (index-*.js)
  const entryChunk = jsFiles.find(f => basename(f.path).startsWith('index-'));
  if (entryChunk) {
    const entryOk = entryChunk.size <= BUDGET.entryChunk;
    console.log(`  Entry       ${formatSize(entryChunk.size).padStart(10)} / ${formatSize(BUDGET.entryChunk).padStart(10)}  ${entryOk ? '✅' : '❌'}`);
    if (!entryOk) violations.push(`Entry chunk (${formatSize(entryChunk.size)}) exceeds budget (${formatSize(BUDGET.entryChunk)})`);
  }

  // Bandwidth estimate
  const totalBundle = totalJS + totalCSS;
  // Assume ~3x gzip compression ratio
  const gzippedEstimate = totalBundle / 3;
  const monthlyLoads200k = (gzippedEstimate * 200_000) / (1024 * 1024 * 1024);
  console.log(`\n📡 Bandwidth Estimate (200K loads/month):`);
  console.log(`  Gzipped bundle: ~${formatSize(gzippedEstimate)}`);
  console.log(`  Monthly bandwidth: ~${monthlyLoads200k.toFixed(1)} GB / 100 GB free tier`);

  console.log('\n' + '='.repeat(60));

  if (violations.length > 0) {
    console.log('\n❌ Budget violations found:');
    violations.forEach(v => console.log(`   - ${v}`));
    console.log('');
    process.exit(1);
  } else {
    console.log('\n✅ All bundle size budgets passed!\n');
    process.exit(0);
  }
}

run();
