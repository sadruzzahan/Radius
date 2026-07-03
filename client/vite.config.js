import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  envDir: fileURLToPath(new URL("..", import.meta.url)),
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true
      },
      "/socket.io": {
        target: "http://localhost:8000",
        changeOrigin: true,
        ws: true
      }
    }
  },
  preview: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true
  }
});
