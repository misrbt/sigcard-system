import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'url'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')

  if (mode !== 'development' && !env.VITE_API_BASE_URL) {
    throw new Error(
      '\n\nERROR: VITE_API_BASE_URL is not set.\n' +
      'A production/staging build without this would bake localhost:8000 into\n' +
      'the JS and break login for every user.\n' +
      'Set VITE_API_BASE_URL in frontend/.env before running npm run build.\n'
    )
  }

  return {
    plugins: [
      tailwindcss(),
    ],
    esbuild: {
      jsx: 'automatic',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@layouts': path.resolve(__dirname, './src/components/layout'),
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        onwarn(warning, warn) {
          // Suppress "use client" directive warnings from third-party packages
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('"use client"')) return
          warn(warning)
        },
        output: {
          manualChunks: {
            'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui':     ['framer-motion', 'sweetalert2'],
            'vendor-charts': ['chart.js', 'react-chartjs-2', 'apexcharts', 'react-apexcharts'],
            'vendor-icons':  ['react-icons'],
            'vendor-http':   ['axios', '@tanstack/react-query'],
            'vendor-xlsx':   ['exceljs'],
            'vendor-pdf':    ['jspdf', 'jspdf-autotable'],
            'vendor-upload': ['react-dropzone', 'react-image-crop', 'browser-image-compression'],
          },
        },
      },
    },
  }
})
