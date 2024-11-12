import {defineConfig} from 'vite';
import dts from 'vite-plugin-dts';
import fs from 'fs';

// Copy and paste the Countly script that is required to initialize analytics.
// It's already minified so we don't want to build it again. I've tried it, wasn't working as expected.
const injectCountlyPlugin = () => {
  return {
    name: 'copy-countly-script',
    closeBundle: {
      sequential: true,
      order: 'post',
      handler: () => {
        const countlyScript = fs.readFileSync(require.resolve('countly-sdk-web/lib/countly.min.js'), 'utf-8');
        const embedPath = 'lib/embed.js';
        fs.writeFileSync(embedPath, countlyScript);
      },
    },
  };
};

export default defineConfig({
  build: {
    target: 'esnext',
    lib: {
      entry: {
        index: './src/index.ts',
        embed: './src/embed.ts',
      },
      formats: ['es', 'cjs'],
      fileName: (filename, entryName) => {
        if (filename === 'cjs') {
          return `${entryName}.cjs.js`;
        }
        return `${entryName}.js`;
      },
    },
    rollupOptions: {
      external: ['countly-sdk-web/lib/countly.min.js'],
    },
    outDir: 'lib',
  },
  plugins: [injectCountlyPlugin(), dts()],
});
