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

import {isFunction, isObject} from '@sindresorhus/is';
import {Maybe} from 'true-myth';
import {objectHasOwn} from 'ts-extras';

export type DesktopApplicationLogWrite = (records: readonly string[]) => Promise<unknown>;

type DesktopApplicationLogSelectionOptions = {
  readonly isDesktopApp: boolean;
  readonly readCapability: () => unknown;
};

export function selectDesktopApplicationLogWrite(
  options: DesktopApplicationLogSelectionOptions,
): Maybe<DesktopApplicationLogWrite> {
  const {isDesktopApp, readCapability} = options;
  if (!isDesktopApp) {
    return Maybe.nothing();
  }

  try {
    const capability = readCapability();
    if (isVersionOneCapability(capability)) {
      const write: DesktopApplicationLogWrite = capability.write;

      return Maybe.just(write.bind(capability));
    }
  } catch {
    // An inaccessible preload capability is equivalent to an older Desktop build.
  }

  return Maybe.nothing();
}

function isVersionOneCapability(
  capability: unknown,
): capability is {readonly version: 1; readonly write: DesktopApplicationLogWrite} {
  return (
    isObject(capability) &&
    objectHasOwn(capability, 'version') &&
    capability.version === 1 &&
    objectHasOwn(capability, 'write') &&
    isFunction(capability.write)
  );
}
