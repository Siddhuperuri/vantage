import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset URLs, so the same build works at a domain root, under
  // a project path such as github.io/vantage/, or opened from anywhere
  // else, without a per-host setting to forget.
  base: './',
  server: { port: 5173, host: '127.0.0.1' },
  build: {
    target: 'es2020',
    // three is the bulk of the bundle; keep it in its own chunk so the shell paints first
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
} as Parameters<typeof defineConfig>[0]);
