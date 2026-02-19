import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "images/scene-logo.png", "images/scene-logo.svg"],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,svg,woff,woff2}"],
        navigateFallbackDenylist: [/^\/~oauth/],
        importScripts: ['/sw-push.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
      manifest: {
        name: "SCENE — Capture, Rate & Share Your Favorite Concerts",
        short_name: "SCENE",
        description: "Capture, rate, rank, and share your favorite shows.",
        theme_color: "#0a0f1a",
        background_color: "#0a0f1a",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/images/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/images/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/images/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split mapbox into its own chunk — heaviest dependency (~970KB)
          if (id.includes("mapbox-gl")) return "mapbox";
          // Split framer-motion — animation lib not needed on first paint
          if (id.includes("framer-motion")) return "framer-motion";
          // Split charting library — only used in admin/dashboard
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          // Core React runtime
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) return "react";
          // Radix UI components
          if (id.includes("@radix-ui")) return "radix";
        },
      },
    },
  },
}));
