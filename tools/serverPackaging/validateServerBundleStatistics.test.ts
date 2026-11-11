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

import {validateServerBundleStatistics} from './validateServerBundleStatistics';

describe('server bundle dependency verification', () => {
  it('allows Node built-in externals', () => {
    const actualFailures = validateServerBundleStatistics({
      modules: [{identifier: 'external node-commonjs "node:fs"'}, {identifier: 'external node-commonjs "path"'}],
    });

    expect(actualFailures).toEqual([]);
  });

  it('rejects npm externals in nested modules and child compilations', () => {
    const actualFailures = validateServerBundleStatistics({
      modules: [{modules: [{identifier: 'external commonjs "express"'}]}],
      children: [{modules: [{identifier: 'external commonjs "hbs"'}]}],
    });

    expect(actualFailures).toEqual([
      'Unexpected external dependency: external commonjs "express"',
      'Unexpected external dependency: external commonjs "hbs"',
    ]);
  });

  it('rejects truncated module lists that could hide npm externals', () => {
    const actualFailures = validateServerBundleStatistics({modules: [{filteredChildren: 1}]});

    expect(actualFailures).toEqual(['Module statistics must include every module']);
  });
});
