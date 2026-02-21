import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/types': path.resolve(__dirname, './types'),
      '@/context': path.resolve(__dirname, './context'),
      '@/hooks': path.resolve(__dirname, './hooks'),
      'lib': path.resolve(__dirname, './lib'),
      'components': path.resolve(__dirname, './components'),
      'types': path.resolve(__dirname, './types'),
      'context': path.resolve(__dirname, './context'),
      'hooks': path.resolve(__dirname, './hooks'),
      'app': path.resolve(__dirname, './app'),
    },
  },
})