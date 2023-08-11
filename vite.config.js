import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'

import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'apis': fileURLToPath(new URL('./src/apis', import.meta.url)),
      'comps': fileURLToPath(new URL('./src/components', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      less: {
        modifyVars: {
          hack: `true; @import (reference) "${resolve("src/assets/css/base.less")}";`,
        },
        javascriptEnabled: true,
      },
    },
  },
  build: {
    target: 'es2015',
    outDir: "dist",
    assetsDir: "static",
    sourcemap: false,
    minify: "terser",
    chunkSizeWarningLimit: 1500,
    terserOptions: {
      compress: {
        drop_debugger: true  // 生产环境取消debugger
      },
      output: {
        comments: true, // 去掉注释内容
      },
    },
    rollupOptions: {
      output: {
        chunkFileNames: 'static/js/[name]-[hash].js',
        entryFileNames: 'static/js/[name]-[hash].js',
        assetFileNames: 'static/[ext]/[name]-[hash].[ext]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (!['@cool-vue/crud'].find((e) => id.includes(e))) {
              let str = id.toString().split("node_modules/")[1];
              if (str[0] == "@") {
                str = str.replace("/", ".");
              }
              return str.split("/")[0].toString();
            }
          }
        }
      }
    }
  }
})
