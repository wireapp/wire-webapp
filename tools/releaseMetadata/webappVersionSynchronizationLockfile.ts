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

import {isPlainObject} from '@sindresorhus/is';
import {Result, Unit} from 'true-myth';

import {isDeepStrictEqual} from 'node:util';

import {validateWebAppVersion} from './webappVersion.ts';
import type {WebAppPackageDocument} from './webappVersion.ts';

type UpdateWebAppVersionSynchronizationLockfileOptions = {
  readonly lockfileDocument: unknown;
  readonly currentVersion: string;
  readonly targetVersion: string;
};

type ValidateWebAppVersionSynchronizationLockfileChangeOptions = {
  readonly baseLockfileDocument: unknown;
  readonly updatedLockfileDocument: unknown;
  readonly currentVersion: string;
  readonly targetVersion: string;
};

const supportedLockfileVersion = 3;

export function updateWebAppVersionSynchronizationLockfile(
  options: UpdateWebAppVersionSynchronizationLockfileOptions,
): Result<WebAppPackageDocument, Error> {
  const {lockfileDocument, currentVersion, targetVersion} = options;
  if (isPlainObject(lockfileDocument) === false || lockfileDocument.lockfileVersion !== supportedLockfileVersion) {
    return Result.err(new Error('Invalid package-lock.json: expected a lockfileVersion 3 object'));
  }

  const lockedPackages = lockfileDocument.packages;
  if (isPlainObject(lockedPackages) === false) {
    return Result.err(new Error('Invalid package-lock.json: missing packages object'));
  }

  const lockedRootPackage = lockedPackages[''];
  const lockedWebAppPackage = lockedPackages['apps/webapp'];
  if (isPlainObject(lockedRootPackage) === false || isPlainObject(lockedWebAppPackage) === false) {
    return Result.err(new Error('Invalid package-lock.json: missing root or WebApp workspace object'));
  }

  if (
    lockfileDocument.version !== currentVersion ||
    lockedRootPackage.version !== currentVersion ||
    lockedWebAppPackage.version !== currentVersion
  ) {
    return Result.err(new Error(`package-lock.json versions do not match package version ${currentVersion}`));
  }

  const targetVersionResult = validateWebAppVersion(targetVersion);
  if (targetVersionResult.isErr) {
    return Result.err(targetVersionResult.error);
  }

  return Result.ok({
    ...lockfileDocument,
    version: targetVersionResult.value,
    packages: {
      ...lockedPackages,
      '': {...lockedRootPackage, version: targetVersionResult.value},
      'apps/webapp': {...lockedWebAppPackage, version: targetVersionResult.value},
    },
  });
}

export function validateWebAppVersionSynchronizationLockfileChange(
  options: ValidateWebAppVersionSynchronizationLockfileChangeOptions,
): Result<Unit, Error> {
  const {baseLockfileDocument, updatedLockfileDocument, currentVersion, targetVersion} = options;
  const expectedLockfileResult = updateWebAppVersionSynchronizationLockfile({
    lockfileDocument: baseLockfileDocument,
    currentVersion,
    targetVersion,
  });

  if (expectedLockfileResult.isErr) {
    return Result.err(expectedLockfileResult.error);
  }

  if (isDeepStrictEqual(expectedLockfileResult.value, updatedLockfileDocument) === false) {
    return Result.err(new Error('package-lock.json does not contain exactly the expected WebApp version changes'));
  }

  return Result.ok(Unit);
}
