import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    open: true,
    allowedHosts: ['10k.undefinedspace.com'],
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      },
      '/server': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/server/, '')
      }
    }
  }
});
