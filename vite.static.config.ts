import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "static",
  publicDir: "../public",
  plugins: [react()],
  build: { outDir: "../deploy", emptyOutDir: true },
});
