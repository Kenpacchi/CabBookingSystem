import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // When served standalone (npm run dev), proxy /api calls to the Spring Boot backend
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/otp': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Output to dist/ (Maven will pick this up)
    outDir: 'dist',
    emptyOutDir: true,
  },
})
