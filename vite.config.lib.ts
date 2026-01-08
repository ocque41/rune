import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    build: {
        lib: {
            entry: resolve(__dirname, 'components/playground/index.ts'),
            name: 'RunePlayground',
            fileName: 'rune-playground',
            formats: ['es', 'umd'],
        },
        rollupOptions: {
            external: ['react', 'react-dom', 'lucide-react', 'animejs', 'zustand'],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                    'lucide-react': 'LucideReact',
                    animejs: 'anime',
                    zustand: 'zustand',
                },
            },
        },
        outDir: 'dist-lib',
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './'),
        },
    },
});
