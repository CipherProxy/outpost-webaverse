import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'duck-functions.js'),
      name: 'duck',
      fileName: (format) => `duck-functions.${format}.js`
    }
  }
});
