import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

//Vite sert le front (5173) et redirige /api vers Express (3000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' }
  },
  build: { outDir: 'dist' },
  test: { environment: 'node', include: ['src/**/*.test.ts'] }
});
