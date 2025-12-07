import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
    server: {
        host: "::",
        port: 8089,
        proxy: {
            "/api": {
                target: "http://localhost:8899",
                changeOrigin: true,
            },
            "/ws": {
                target: "http://localhost:8899",
                changeOrigin: true,
                ws: true,
            },
        },
    },
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    define: {
        global: "globalThis",
    },
}));