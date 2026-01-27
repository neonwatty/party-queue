import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split React into its own chunk (changes rarely)
          'vendor-react': ['react', 'react-dom'],
          // Split Supabase into its own chunk
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
