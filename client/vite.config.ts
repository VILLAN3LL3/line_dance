import { defineConfig } from "vite";

import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    hmr: true
  },
  cacheDir: 'node_modules/.vite',
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      }
    },
    cssCodeSplit: true,
    write: false
  },
  esbuild: {
    sourcemap: false
  },
  publicDir: 'public',
  optimizeDeps: {
    include: []
  }
});
