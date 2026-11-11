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

import {isArray, isPlainObject, isString, isUndefined} from '@sindresorhus/is';

import {isBuiltin} from 'node:module';

export function validateServerBundleStatistics(statistics: unknown): readonly string[] {
  if (!isPlainObject(statistics)) {
    return ['Invalid server bundle statistics'];
  }

  const failures: string[] = [];
  if (!isUndefined(statistics.filteredModules) || !isUndefined(statistics.filteredChildren)) {
    failures.push('Module statistics must include every module');
  }
  if (isString(statistics.identifier) && statistics.identifier.startsWith('external ')) {
    const externalRequest = /"([^"]+)"$/.exec(statistics.identifier)?.[1];
    if (isUndefined(externalRequest) || !isBuiltin(externalRequest)) {
      failures.push(`Unexpected external dependency: ${statistics.identifier}`);
    }
  }
  for (const collectionName of ['modules', 'children']) {
    const nestedStatistics = statistics[collectionName];
    if (isArray(nestedStatistics)) {
      failures.push(...nestedStatistics.flatMap(validateServerBundleStatistics));
    }
  }

  return failures;
}
