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

import assert from 'node:assert';

import {isUndefined} from '@sindresorhus/is';

import {formatTranslationPlaceholderMismatch, validateTranslationPlaceholders} from './translationPlaceholderValidator';

describe('validateTranslationPlaceholders', () => {
  it('accepts identical placeholders', () => {
    const actualMismatches = validateTranslationPlaceholders({
      locale: 'de-DE',
      filePath: 'apps/webapp/src/i18n/de-DE.json',
      canonicalTranslations: {message: 'Hello {name}, uploaded {count} files'},
      translatedTranslations: {message: 'Hallo {name}, {count} Dateien hochgeladen'},
    });

    expect(actualMismatches).toStrictEqual([]);
  });

  it('accepts a canonical key that is absent from the translated locale', () => {
    const actualMismatches = validateTranslationPlaceholders({
      locale: 'de-DE',
      filePath: 'apps/webapp/src/i18n/de-DE.json',
      canonicalTranslations: {message: 'Queued {name}'},
      translatedTranslations: {},
    });

    expect(actualMismatches).toStrictEqual([]);
  });

  it('accepts placeholders reordered in translated text', () => {
    const actualMismatches = validateTranslationPlaceholders({
      locale: 'de-DE',
      filePath: 'apps/webapp/src/i18n/de-DE.json',
      canonicalTranslations: {message: 'Hello {name}, uploaded {count} files'},
      translatedTranslations: {message: '{count} Dateien wurden von {name} hochgeladen'},
    });

    expect(actualMismatches).toStrictEqual([]);
  });

  it('rejects a translated structural marker', () => {
    const actualMismatches = validateTranslationPlaceholders({
      locale: 'si-LK',
      filePath: 'apps/webapp/src/i18n/si-LK.json',
      canonicalTranslations: {
        legalHoldModalText: 'Recorded by device:[br][fingerprint][br]Included messages.',
      },
      translatedTranslations: {
        legalHoldModalText: 'උපාංගය මගින් පටිගත කෙරේ:[br][ඇඟිලි සටහන][br]ඇතුළත් පණිවිඩ.',
      },
    });

    expect(actualMismatches).toStrictEqual([
      {
        locale: 'si-LK',
        filePath: 'apps/webapp/src/i18n/si-LK.json',
        translationKey: 'legalHoldModalText',
        missingMarkers: ['[fingerprint]'],
        unexpectedMarkers: ['[ඇඟිලි සටහන]'],
      },
    ]);
  });

  it('rejects a missing marker', () => {
    const actualMismatches = validateTranslationPlaceholders({
      locale: 'fr-FR',
      filePath: 'apps/webapp/src/i18n/fr-FR.json',
      canonicalTranslations: {message: 'Uploaded [br] {name}'},
      translatedTranslations: {message: 'Téléversé {name}'},
    });

    expect(actualMismatches[0]?.missingMarkers).toStrictEqual(['[br]']);
    expect(actualMismatches[0]?.unexpectedMarkers).toStrictEqual([]);
  });

  it('rejects an unexpected marker', () => {
    const actualMismatches = validateTranslationPlaceholders({
      locale: 'fr-FR',
      filePath: 'apps/webapp/src/i18n/fr-FR.json',
      canonicalTranslations: {message: 'Uploaded {name}'},
      translatedTranslations: {message: 'Téléversé [name]'},
    });

    expect(actualMismatches[0]?.missingMarkers).toStrictEqual(['{name}']);
    expect(actualMismatches[0]?.unexpectedMarkers).toStrictEqual(['[name]']);
  });

  it('rejects a changed duplicate occurrence count', () => {
    const actualMismatches = validateTranslationPlaceholders({
      locale: 'de-DE',
      filePath: 'apps/webapp/src/i18n/de-DE.json',
      canonicalTranslations: {message: 'First [br] second'},
      translatedTranslations: {message: 'First [br] second [br]'},
    });

    expect(actualMismatches[0]?.missingMarkers).toStrictEqual([]);
    expect(actualMismatches[0]?.unexpectedMarkers).toStrictEqual(['[br]']);
  });

  it('validates both escaped and dangerous runtime substitution forms', () => {
    const actualMismatches = validateTranslationPlaceholders({
      locale: 'de-DE',
      filePath: 'apps/webapp/src/i18n/de-DE.json',
      canonicalTranslations: {message: 'Hello {name}, press [bold]save[/bold].'},
      translatedTranslations: {message: 'Hallo {nombre}, drücke [fett]speichern[/fett].'},
    });

    expect(actualMismatches[0]?.missingMarkers).toStrictEqual(['[/bold]', '[bold]', '{name}']);
    expect(actualMismatches[0]?.unexpectedMarkers).toStrictEqual(['[/fett]', '[fett]', '{nombre}']);
  });

  it('returns deterministic and actionable error information', () => {
    const actualMismatches = validateTranslationPlaceholders({
      locale: 'si-LK',
      filePath: 'apps/webapp/src/i18n/si-LK.json',
      canonicalTranslations: {legalHoldModalText: 'Text [fingerprint]'},
      translatedTranslations: {legalHoldModalText: 'Text [ඇඟිලි සටහන]'},
    });

    const firstMismatch = actualMismatches[0];
    assert(!isUndefined(firstMismatch), 'Expected one translation placeholder mismatch');

    const actualDiagnostic = formatTranslationPlaceholderMismatch(firstMismatch);
    const expectedDiagnostic =
      'apps/webapp/src/i18n/si-LK.json (si-LK), key "legalHoldModalText": missing markers: [fingerprint]; unexpected markers: [ඇඟිලි සටහන]';

    expect(actualDiagnostic).toBe(expectedDiagnostic);
  });
});
