import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            name: 'HydraSynth',
            fileName: (format) => `hydra-synth.${format === 'es' ? 'mjs' : 'js'}`,
            formats: ['es', 'umd']
        },
        rollupOptions: {
            external: [], // Bundle everything
        },
        outDir: 'dist',
        minify: true,
        emptyOutDir: false, // Don't wipe dist as it might contain other build artifacts, or maybe true? User used 'dist' for individual files.
        // If we use 'dist', we might overwrite or mix. The current build script wipes dist.
        // If we run build:dist, maybe we should output to dist/bundle?
        // User asked for "a dist". Standard is often dist/hydra-synth.js
        // I'll set emptyOutDir: false so it doesn't delete existing ESM files if any.
    }
})
