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

import {isEmptyArray} from '@sindresorhus/is';

import type {TranslationStringMap} from './translationFileSchema.ts';

import {extractTranslationMarkers} from '../../apps/webapp/src/script/util/localizerUtil/translationMarkers.ts';

export type TranslationPlaceholderValidationOptions = {
  readonly locale: string;
  readonly filePath: string;
  readonly canonicalTranslations: TranslationStringMap;
  readonly translatedTranslations: TranslationStringMap;
};

export type TranslationPlaceholderMismatch = {
  readonly locale: string;
  readonly filePath: string;
  readonly translationKey: string;
  readonly missingMarkers: readonly string[];
  readonly unexpectedMarkers: readonly string[];
};

function countMarkers(markers: readonly string[]): Map<string, number> {
  return markers.reduce((markerCounts, marker): Map<string, number> => {
    const currentMarkerCount = markerCounts.get(marker);
    markerCounts.set(marker, currentMarkerCount === undefined ? 1 : currentMarkerCount + 1);

    return markerCounts;
  }, new Map<string, number>());
}

type FindMarkerCountDifferenceOptions = {
  readonly expectedMarkerCounts: ReadonlyMap<string, number>;
  readonly actualMarkerCounts: ReadonlyMap<string, number>;
};

function findMarkerCountDifference(options: FindMarkerCountDifferenceOptions): string[] {
  const {expectedMarkerCounts, actualMarkerCounts} = options;
  const markerNames = [...new Set([...expectedMarkerCounts.keys(), ...actualMarkerCounts.keys()])].toSorted();

  return markerNames.flatMap((markerName): string[] => {
    const expectedMarkerCount = expectedMarkerCounts.get(markerName) ?? 0;
    const actualMarkerCount = actualMarkerCounts.get(markerName) ?? 0;
    const missingMarkerCount = expectedMarkerCount - actualMarkerCount;

    return missingMarkerCount > 0
      ? Array.from({length: missingMarkerCount}, (): string => {
          return markerName;
        })
      : [];
  });
}

export function validateTranslationPlaceholders(
  options: TranslationPlaceholderValidationOptions,
): readonly TranslationPlaceholderMismatch[] {
  return Object.keys(options.canonicalTranslations)
    .toSorted()
    .flatMap((translationKey): TranslationPlaceholderMismatch[] => {
      if (!Object.hasOwn(options.translatedTranslations, translationKey)) {
        return [];
      }

      const canonicalValue = options.canonicalTranslations[translationKey];
      const translatedValue = options.translatedTranslations[translationKey];
      const canonicalMarkerCounts = countMarkers(extractTranslationMarkers(canonicalValue));
      const translatedMarkerCounts = countMarkers(extractTranslationMarkers(translatedValue));
      const missingMarkers = findMarkerCountDifference({
        expectedMarkerCounts: canonicalMarkerCounts,
        actualMarkerCounts: translatedMarkerCounts,
      });
      const unexpectedMarkers = findMarkerCountDifference({
        expectedMarkerCounts: translatedMarkerCounts,
        actualMarkerCounts: canonicalMarkerCounts,
      });

      if (isEmptyArray(missingMarkers) && isEmptyArray(unexpectedMarkers)) {
        return [];
      }

      return [
        {
          locale: options.locale,
          filePath: options.filePath,
          translationKey,
          missingMarkers,
          unexpectedMarkers,
        },
      ];
    });
}

function formatMarkers(markers: readonly string[]): string {
  return isEmptyArray(markers) ? 'none' : markers.join(', ');
}

export function formatTranslationPlaceholderMismatch(mismatch: TranslationPlaceholderMismatch): string {
  return `${mismatch.filePath} (${mismatch.locale}), key "${mismatch.translationKey}": missing markers: ${formatMarkers(
    mismatch.missingMarkers,
  )}; unexpected markers: ${formatMarkers(mismatch.unexpectedMarkers)}`;
}
