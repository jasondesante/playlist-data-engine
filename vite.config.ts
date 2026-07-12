/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        gateway: 'src/gateway.ts',
        analysis: 'src/analysis.ts',
      },
      name: 'PlaylistDataEngine',
      fileName: (format: 'es' | 'cjs', entryName: string) => {
        if (entryName === 'gateway') return `gateway.${format === 'es' ? 'mjs' : 'js'}`;
        if (entryName === 'analysis') return `analysis.${format === 'es' ? 'mjs' : 'js'}`;
        return `playlist-data-engine.${format === 'es' ? 'mjs' : 'js'}`;
      }
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'essentia.js',
        '@tensorflow/tfjs',
        '@ar.io/wayfinder-core',
        '@ar.io/sdk',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.config.ts',
      ],
    },
  } as any,
} as any)
