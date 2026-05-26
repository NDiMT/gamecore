import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "./",
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        horror: resolve(__dirname, "horror.html"),
      },
    },
  },
});
