import {defineConfig} from 'vite';
import dts from 'vite-plugin-dts';
import {resolve} from 'path';

export default defineConfig({
  build: {
    target: 'esnext',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: format => {
        if (format === 'cjs') {
          return 'index.cjs';
        }
        return 'index.js';
      },
    },
    rollupOptions: {
      external: ['logdown', '@datadog/browser-logs', '@datadog/browser-rum', 'fs', 'path', 'fs/promises'],
    },
    outDir: 'lib',
  },
  plugins: [
    dts({
      outDir: 'lib',
      insertTypesEntry: true,
    }),
  ],
});
