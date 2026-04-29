import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'

const external = (id) => !id.startsWith('.') && !id.startsWith('/')

export default [
  {
    input: './src/index.ts',
    output: {
      file: './dist/index.js',
      format: 'es',
      sourcemap: true
    },
    external,
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      })
    ]
  },
  {
    input: './src/index.ts',
    output: {
      file: './dist/index.d.ts',
      format: 'es'
    },
    external,
    plugins: [dts()]
  }
]
