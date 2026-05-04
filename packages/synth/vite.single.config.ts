import { defineConfig } from 'vite'
import path from 'path'

const v0Banner = [
  '/*',
  ' * hydra-webgpu-v0.js',
  ' * Portable one-file snapshot of the current hydra-synth WebGPU backend.',
  ' * Generated from packages/synth/src/index.ts.',
  ' * License: AGPL-3.0-or-later',
  ' */',
  ''
].join('\n')

export default defineConfig({
  plugins: [
    {
      name: 'hydra-v0-banner',
      generateBundle (_options, bundle) {
        for (const chunk of Object.values(bundle)) {
          if (chunk.type !== 'chunk' || !chunk.fileName.endsWith('.js')) continue
          chunk.code = `${v0Banner}${chunk.code}`
        }
      }
    }
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'hydra-webgpu-v0.js'
    },
    outDir: path.resolve(__dirname, '../../v0'),
    minify: false,
    sourcemap: false,
    emptyOutDir: false,
    rollupOptions: {
      external: [],
      output: {
        inlineDynamicImports: true
      }
    }
  }
})
