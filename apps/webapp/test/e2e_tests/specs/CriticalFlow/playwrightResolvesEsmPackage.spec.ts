import {expect, test} from '@playwright/test';
import {isEmptyString} from '@sindresorhus/is';

test(
  'loads the runtime export from an ESM package',
  {tag: ['@regression']},
  (): void => {
    expect(isEmptyString('')).toBe(true);
  },
);
