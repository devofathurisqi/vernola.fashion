import { defineConfig } from "vite";
export default defineConfig({
  worker: { format: "es" },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom/client"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
});
