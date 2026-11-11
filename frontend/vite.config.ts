import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const hostinger = mode === 'hostinger'

  return {
    plugins: [react()],
    base: hostinger ? '/client/' : '/',
    build: hostinger
      ? {
          outDir: '../public/client',
          emptyOutDir: true,
        }
      : {
          outDir: 'dist',
          emptyOutDir: true,
        },
  }
})
