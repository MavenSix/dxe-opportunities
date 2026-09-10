import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Expose the public Supabase variables written by the Vercel ⇄ Supabase
  // Marketplace integration in addition to the usual VITE_* ones. Only this
  // narrow prefix is exposed — never the OPPORTUNTIES_POSTGRES_* / secret vars.
  envPrefix: ["VITE_", "NEXT_PUBLIC_OPPORTUNTIES_SUPABASE_"],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
