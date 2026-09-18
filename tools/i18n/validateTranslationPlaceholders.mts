#!/usr/bin/env node

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

import {isEmptyArray, isError} from '@sindresorhus/is';

import {readFileSync, readdirSync} from 'node:fs';
import {join, relative} from 'node:path';

import {translationFileSchema, type TranslationStringMap} from './translationFileSchema.ts';
import {
  formatTranslationPlaceholderMismatch,
  type TranslationPlaceholderMismatch,
  validateTranslationPlaceholders,
} from './translationPlaceholderValidator.ts';

type TranslationLocaleFile = {
  readonly locale: string;
  readonly filePath: string;
  readonly translations: TranslationStringMap;
};

function describeError(error: unknown): string {
  return isError(error) ? error.message : 'Unknown error';
}

function readTranslationFile(filePath: string): TranslationStringMap {
  let parsedTranslationFile: unknown;

  try {
    parsedTranslationFile = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
  } catch (error: unknown) {
    throw new Error(`Unable to read translation file ${filePath}: ${describeError(error)}`);
  }

  const validationResult = translationFileSchema.safeParse(parsedTranslationFile);
  if (!validationResult.success) {
    throw new Error(`Translation file ${filePath} has an invalid structure: ${validationResult.error.message}`);
  }

  return validationResult.data;
}

function readLocaleFiles(
  translationDirectoryPath: string,
  repositoryRootPath: string,
): readonly TranslationLocaleFile[] {
  return readdirSync(translationDirectoryPath)
    .filter((fileName): boolean => {
      return fileName.endsWith('.json') && fileName !== 'en-US.json';
    })
    .sort()
    .map((fileName): TranslationLocaleFile => {
      const absoluteFilePath = join(translationDirectoryPath, fileName);

      return {
        locale: fileName.slice(0, -'.json'.length),
        filePath: relative(repositoryRootPath, absoluteFilePath),
        translations: readTranslationFile(absoluteFilePath),
      };
    });
}

function validateLocaleFiles(
  canonicalTranslations: TranslationStringMap,
  localeFiles: readonly TranslationLocaleFile[],
): readonly TranslationPlaceholderMismatch[] {
  return localeFiles.flatMap((localeFile): readonly TranslationPlaceholderMismatch[] => {
    return validateTranslationPlaceholders({
      locale: localeFile.locale,
      filePath: localeFile.filePath,
      canonicalTranslations,
      translatedTranslations: localeFile.translations,
    });
  });
}

function runTranslationPlaceholderValidation(): void {
  const repositoryRootPath = process.cwd();
  const translationDirectoryPath = join(repositoryRootPath, 'apps/webapp/src/i18n');
  const canonicalTranslationFilePath = join(translationDirectoryPath, 'en-US.json');
  const canonicalTranslations = readTranslationFile(canonicalTranslationFilePath);
  const localeFiles = readLocaleFiles(translationDirectoryPath, repositoryRootPath);
  const mismatches = validateLocaleFiles(canonicalTranslations, localeFiles);

  if (isEmptyArray(mismatches)) {
    console.info(`Validated translation markers in ${localeFiles.length} locale files against en-US.json.`);

    return;
  }

  console.error(
    [
      `Found ${mismatches.length} translation marker mismatch${mismatches.length === 1 ? '' : 'es'}:`,
      ...mismatches.map(formatTranslationPlaceholderMismatch),
    ].join('\n'),
  );
  process.exitCode = 1;
}

try {
  runTranslationPlaceholderValidation();
} catch (error: unknown) {
  console.error(describeError(error));
  process.exitCode = 1;
}
