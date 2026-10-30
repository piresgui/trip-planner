import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // caminhos relativos: o build abre direto do disco (dist/index.html)
  base: "./",
  server: {
    port: 5173,
    open: true,
  },
});
