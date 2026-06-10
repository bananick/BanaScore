import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // host: true binds 0.0.0.0 so other devices on the same Wi-Fi (tablets,
    // phones) can reach the dev app at http://<IP-du-PC>:<port>.
    host: true,
    // Dev port (5173 is used by another app here). Override with VITE_PORT.
    port: Number(process.env.VITE_PORT) || 5180,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
