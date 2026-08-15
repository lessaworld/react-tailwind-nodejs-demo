import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Express runs separately on 3000 in dev (npm run dev inside server/).
      // In production Express serves the built client itself, so this proxy
      // is dev-only and there is no CORS config anywhere in this app.
      '/api': 'http://localhost:3000',
    },
  },
})
