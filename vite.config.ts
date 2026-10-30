import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// `npm run demo` serves demo/, a page to try the calculator on; `npm run demo:build` builds it into demo/dist to host.
export default defineConfig({
  root: 'demo',
  plugins: [react()],
})
