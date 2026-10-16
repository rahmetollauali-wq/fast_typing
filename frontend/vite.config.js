import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // доступ к dev-серверу из-за пределов контейнера
    port: 5173,
    watch: { usePolling: true }, // чтобы изменения подхватывались на Windows и macOS
    proxy: {
      // Запросы /api/... уходят в контейнер backend по имени сервиса
      "/api": "http://backend:3000",
    },
  },
});
