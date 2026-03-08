import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/ai-run-coach/',
  test: {
    environment: 'node',          // pure TS — no browser APIs needed
    include: ['src/**/*.test.ts'],
    reporters: ['verbose'],
  },
})
