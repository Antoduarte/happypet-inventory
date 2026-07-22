import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: process.env.NODE_ENV === 'production' ? '/static/frontend_build/' : '/',
    server: {
        proxy: {
            '/api': { target: 'http://localhost:8000', changeOrigin: true },
        },
    },
    build: {
        outDir: '../backend/static/frontend_build',
        emptyOutDir: true,
    },
    resolve: {
        alias: { '@': path.resolve(__dirname, './src') },
    },
});
