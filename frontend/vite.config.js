import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Any frontend request to /api will be automatically forwarded to the backend
      '/api': 'http://localhost:8080'
    }
  }
})
