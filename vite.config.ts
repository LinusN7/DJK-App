import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),

    // 🟢 PWA-Plugin aktivieren
    VitePWA({
      registerType: "autoUpdate", // Service Worker aktualisiert sich automatisch
      includeAssets: ["favicon.ico", "djk_logo.png"],

      manifest: {
        name: "DJK Konstanz",
        short_name: "DJK App",
        description: "Vereinsverwaltung und Carpool-App für die DJK Konstanz",
        theme_color: "#00994C",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/djk_logo.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/djk_logo.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
