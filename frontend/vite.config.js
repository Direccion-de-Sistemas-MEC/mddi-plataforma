import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    fs: { allow: [".."] },               // permite importar ../shared (modelo y operaciones compartidos con el backend)
    proxy: { "/api": "http://localhost:8080" }, // en desarrollo, la API corre aparte
  },
  build: { outDir: "dist", sourcemap: false },
});
