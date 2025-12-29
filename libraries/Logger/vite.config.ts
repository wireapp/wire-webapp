import {defineConfig} from 'vite';
import dts from 'vite-plugin-dts';
import {resolve} from 'path';

export default defineConfig({
  build: {
    target: 'esnext',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      // Only build ESM format to avoid Datadog being loaded twice
      // Webpack can consume ESM modules natively
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      // Bundle all dependencies to avoid require() issues in webpack
      // Only keep Node.js built-ins as external
      external: ['fs', 'path', 'fs/promises'],
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
