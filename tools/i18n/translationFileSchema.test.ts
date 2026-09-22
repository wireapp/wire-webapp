/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {translationFileSchema} from './translationFileSchema';

describe('translationFileSchema', () => {
  it('accepts a flat translation object with string values', () => {
    const translationFile = {
      greeting: 'Hello {name}',
      legalHoldModalText: 'Recorded by [fingerprint]',
    };

    const validationResult = translationFileSchema.safeParse(translationFile);

    expect(validationResult.success).toBe(true);
    if (validationResult.success) {
      expect(validationResult.data).toStrictEqual(translationFile);
    }
  });

  it.each([
    ['a primitive value', 'not an object'],
    ['null', null],
    ['an array', ['not', 'a', 'translation', 'object']],
    ['an object with a non-string value', {greeting: 42}],
    ['an object with a nested value', {greeting: {text: 'Hello'}}],
  ])('rejects %s', (_description: string, invalidTranslationFile: unknown) => {
    const validationResult = translationFileSchema.safeParse(invalidTranslationFile);

    expect(validationResult.success).toBe(false);
  });
});
