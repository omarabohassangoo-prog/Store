import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const projectRoot = process.cwd();
const storefrontRoot = path.resolve(projectRoot, 'public');

export default defineConfig(() => ({
  // The actual storefront is the static app under /public. Build it as the
  // deployment root instead of publishing the empty React scaffold at /.
  root: storefrontRoot,
  publicDir: false as const,
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'copy-unbundled-storefront-assets',
      apply: 'build',
      closeBundle(error?: Error): void {
        if (error) return;
        const distDir = path.resolve(projectRoot, 'dist');
        const assetDirs = [
          ['js', path.resolve(storefrontRoot, 'js')],
          ['styles', path.resolve(storefrontRoot, 'styles')],
          ['assets', path.resolve(storefrontRoot, 'assets')],
          ['src/assets', path.resolve(projectRoot, 'src/assets')],
        ] as const;

        for (const [relativePath, sourcePath] of assetDirs) {
          if (fs.existsSync(sourcePath)) {
            fs.cpSync(sourcePath, path.resolve(distDir, relativePath), { recursive: true, force: true });
          }
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': projectRoot,
    },
  },
  build: {
    outDir: path.resolve(projectRoot, 'dist'),
    emptyOutDir: true,
  },
  server: {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
}));
