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
 */

import path from 'node:path';
import {match, P} from 'ts-pattern';
import {Result} from 'true-myth';

export type RspackSmokeAssetPathError = {readonly kind: 'malformedEncoding'} | {readonly kind: 'outsideBuildDirectory'};

export function resolveRspackSmokeAssetPath(
  requestPathname: string,
  buildDirectoryPath: string,
): Result<string, RspackSmokeAssetPathError> {
  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(requestPathname);
  } catch {
    return Result.err({kind: 'malformedEncoding'});
  }

  const requestedPath = decodedPathname.replace(/^\/+/, '');
  const relativeFilePath = match(requestedPath)
    .with('', () => {
      return 'index.html';
    })
    .with(P.union('auth', 'auth/'), () => {
      return 'auth/index.html';
    })
    .with(P.union('unsupported', 'unsupported/'), () => {
      return 'unsupported/index.html';
    })
    .otherwise(filePath => {
      return filePath;
    });

  const requestedFilePath = path.resolve(buildDirectoryPath, relativeFilePath);
  const pathFromBuildDirectory = path.relative(buildDirectoryPath, requestedFilePath);

  return match(pathFromBuildDirectory.startsWith('..') || path.isAbsolute(pathFromBuildDirectory))
    .with(true, () => {
      return Result.err({kind: 'outsideBuildDirectory' as const});
    })
    .with(false, () => {
      return Result.ok(requestedFilePath);
    })
    .exhaustive();
}
