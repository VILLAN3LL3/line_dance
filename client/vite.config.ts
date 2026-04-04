import { defineConfig } from "vite";

import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    hmr: true,
  },
  cacheDir: "node_modules/.vite",
  build: {
    outDir: "dist",
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("react") || id.includes("react-dom")) {
            return "vendor";
          }
        },
      },
    },
    cssCodeSplit: true,
    write: false,
  },
  esbuild: {
    sourcemap: false,
  },
  publicDir: "public",
  optimizeDeps: {
    include: [],
  },
});
