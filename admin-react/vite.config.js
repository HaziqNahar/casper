import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(function (_a) {
    var _b;
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), "");
    var apiTarget = (_b = env.VITE_API_PROXY_TARGET) !== null && _b !== void 0 ? _b : "http://localhost:5000";
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
                    manualChunks: function (id) {
                        if (id.includes("node_modules")) {
                            if (id.includes("lucide-react"))
                                return "icons";
                            if (id.includes("@hello-pangea/dnd"))
                                return "dnd";
                            return "vendor";
                        }
                        if (id.includes("src/components/common/DataTable") ||
                            id.includes("src/components/common/Badge") ||
                            id.includes("src/components/common/RowsActionMenu") ||
                            id.includes("src/components/common/ColumnVisibilityMenu")) {
                            return "table-common";
                        }
                    },
                },
            },
        },
    };
});