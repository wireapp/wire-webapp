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
import {Result} from 'true-myth';

import {resolveRspackSmokeAssetPath} from './rspackSmokeAssetPathResolver';

describe('resolveRspackSmokeAssetPath', () => {
  const buildDirectoryPath = path.resolve('/rspack-build');

  it('resolves the application root to the generated index document', () => {
    const actualFilePath = resolveRspackSmokeAssetPath('/', buildDirectoryPath);
    const expectedFilePath = path.resolve(buildDirectoryPath, 'index.html');

    expect(actualFilePath).toEqual(Result.ok(expectedFilePath));
  });

  it('resolves the authentication route to the generated auth document', () => {
    const actualFilePath = resolveRspackSmokeAssetPath('/auth/', buildDirectoryPath);
    const expectedFilePath = path.resolve(buildDirectoryPath, 'auth/index.html');

    expect(actualFilePath).toEqual(Result.ok(expectedFilePath));
  });

  it('resolves nested build assets without changing their path', () => {
    const actualFilePath = resolveRspackSmokeAssetPath('/min/runtime.js', buildDirectoryPath);
    const expectedFilePath = path.resolve(buildDirectoryPath, 'min/runtime.js');

    expect(actualFilePath).toEqual(Result.ok(expectedFilePath));
  });

  it('rejects encoded paths that escape the generated build directory', () => {
    const actualFilePath = resolveRspackSmokeAssetPath('/%2e%2e/private.txt', buildDirectoryPath);

    expect(actualFilePath).toEqual(Result.err({kind: 'outsideBuildDirectory'}));
  });

  it('rejects malformed encoded paths', () => {
    const actualFilePath = resolveRspackSmokeAssetPath('/%2', buildDirectoryPath);

    expect(actualFilePath).toEqual(Result.err({kind: 'malformedEncoding'}));
  });
});
