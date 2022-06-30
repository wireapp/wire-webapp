import {typescript} from '@betterer/typescript';

export default {
  'stricter compilation': () =>
    typescript('./tsconfig.json', {
      strict: true,
    }).include('./src/**/*.{ts,tsx}'),
};
