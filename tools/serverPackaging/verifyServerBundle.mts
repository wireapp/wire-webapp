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

import {isArray, isNonEmptyArray, isPlainObject} from '@sindresorhus/is';

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {validateServerBundleStatistics} from './validateServerBundleStatistics.ts';
import {verifyServerRuntime} from './verifyServerRuntime.mts';

async function main(): Promise<void> {
  try {
    const statistics: unknown = JSON.parse(readFileSync('apps/server/build/server-bundle-stats.json', 'utf8'));
    assert(isPlainObject(statistics) && isNonEmptyArray(statistics.modules));
    assert.deepEqual(validateServerBundleStatistics(statistics), []);
    assert(isArray(statistics.assets));
    const [bundleAsset] = statistics.assets.filter((asset: unknown) => {
      return isPlainObject(asset) && asset.name === 'index.js';
    });
    assert(isPlainObject(bundleAsset) && isPlainObject(bundleAsset.info));
    assert.equal(bundleAsset.info.minimized, true, 'Rspack must minimize the production bundle');
    await verifyServerRuntime(resolve('apps/server/dist'));
  } catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
  }
}

void main();
