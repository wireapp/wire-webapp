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

import {isNonEmptyString} from '@sindresorhus/is';
import {maybe as Maybe} from 'true-myth';

type ResolveActiveDeviceIdOptions = {
  readonly availableIds: readonly string[];
  readonly defaultId: string;
  readonly fallbackIds: readonly string[];
  readonly preferredId: string;
};

export function resolveActiveDeviceId(options: ResolveActiveDeviceIdOptions): string {
  const {availableIds, defaultId, fallbackIds, preferredId} = options;
  const availableIdSet = new Set(availableIds);
  const candidateIds = [preferredId, ...fallbackIds];

  const resolvedId = Maybe.find(candidateId => {
    return isNonEmptyString(candidateId) && availableIdSet.has(candidateId);
  }, candidateIds);

  return resolvedId.match({
    Just: activeId => {
      return activeId;
    },
    Nothing: () => {
      return Maybe.find(isNonEmptyString, availableIds).unwrapOr(defaultId);
    },
  });
}
