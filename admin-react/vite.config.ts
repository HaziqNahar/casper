import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_PROXY_TARGET ?? "http://localhost:5000";

  return {
    plugins: [react()],
    // base: "/admin/",
    server: {
      proxy: {
        "/auth": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        "/scim": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        "/oauth2": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("lucide-react")) return "icons";
              if (id.includes("@hello-pangea/dnd")) return "dnd";
              return "vendor";
            }

            if (
              id.includes("src/components/common/DataTable") ||
              id.includes("src/components/common/Badge") ||
              id.includes("src/components/common/RowsActionMenu") ||
              id.includes("src/components/common/ColumnVisibilityMenu")
            ) {
              return "table-common";
            }
          },
        },
      },
    },
  };
});