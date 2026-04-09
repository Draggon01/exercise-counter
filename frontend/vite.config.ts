import {defineConfig} from 'vite';
import {viteStaticCopy} from "vite-plugin-static-copy";

const iconsPath = 'node_modules/@shoelace-style/shoelace/dist/assets/icons';

export default defineConfig({
    root: '.', // Optional, set root to current directory
    resolve: {
        alias: [
            {
                find: /\/assets\/icons\/(.+)/,
                replacement: `${iconsPath}/$1`,
            },
        ],
    },
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
        viteStaticCopy({
            targets: [
                {
                    src: iconsPath,
                    dest: 'assets',
                },
            ],
        }),
    ]
});
