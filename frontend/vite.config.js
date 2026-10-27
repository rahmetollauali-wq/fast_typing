import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// В Docker запросы /api уходят в контейнер backend по имени сервиса.
// Для запуска без Docker: API_PROXY_TARGET=http://localhost:3000 npm run dev
const target = process.env.API_PROXY_TARGET || "http://backend:3000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: { usePolling: true }, // чтобы изменения подхватывались на Windows и macOS
    // ws: true — пропускать WebSocket дуэлей (/api/duels/ws) к backend
    proxy: { "/api": { target, ws: true } },
  },
});
