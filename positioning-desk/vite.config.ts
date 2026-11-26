/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build --mode single` produces one self-contained index.html (for hosting as a single page)
export default defineConfig(({ mode }) => ({
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  base: './',
  test: { globals: true, environment: 'node' },
  build: {
    chunkSizeWarningLimit: 1200,
    outDir: mode === 'single' ? 'dist-single' : 'dist',
  },
}));
