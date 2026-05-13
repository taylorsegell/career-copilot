import { defineConfig } from 'tsup'

const peerExternal = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  'next',
  'lucide-react',
  'react-markdown',
  'remark-gfm',
  'clsx',
  'tailwind-merge',
] as const

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    clean: true,
    sourcemap: true,
    treeshake: true,
    external: [...peerExternal],
  },
  {
    entry: { server: 'src/server/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    clean: false,
    sourcemap: true,
    treeshake: true,
    external: [...peerExternal],
  },
])
