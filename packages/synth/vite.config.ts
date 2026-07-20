import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        livecoding: path.resolve(__dirname, 'src/livecoding.ts')
      },
      name: 'HydraSynth',
      fileName: (_format, entryName) => `${entryName}.js`,
      formats: ['es']
    },
    rollupOptions: {
      external: [],
      output: { exports: 'named' }
    },
    outDir: 'dist',
    minify: true,
    emptyOutDir: true
  }
})
