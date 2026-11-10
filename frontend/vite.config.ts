import {defineConfig} from 'vite';
import {viteStaticCopy} from "vite-plugin-static-copy";

export default defineConfig({
    root: '.', // Optional, set root to current directory
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:8090',
                changeOrigin: true,
                secure: false
            }
        }
    },
    build: {
        target: 'esnext',
        outDir: 'dist', // Directory for build output
        rollupOptions: {
            // This ensures static assets like SVGs, CSS, etc., are bundled correctly
            output: {
                // Customize paths if needed
                assetFileNames: 'assets/[name].[hash][extname]',
            },
        }
    },
    plugins: [
        // Shoelace loads its icons from /assets/icons/<name>.svg – served in dev, copied on build
        viteStaticCopy({
            targets: [{
                src: 'node_modules/@shoelace-style/shoelace/dist/assets/icons/*',
                dest: 'assets/icons',
                rename: {stripBase: true},
            }],
        }),
    ]
});
