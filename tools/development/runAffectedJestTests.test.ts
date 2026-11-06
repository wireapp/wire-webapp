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

import {partitionAffectedJestTests} from './runAffectedJestTests';

describe('partitionAffectedJestTests', () => {
  it('skips Playwright E2E files and preserves Jest files in a mixed change', () => {
    const plan = partitionAffectedJestTests([
      'apps/webapp/test/e2e_tests/specs/Drive/drive.spec.ts',
      'apps/webapp/src/script/featureToggles/startupFeatureToggles.test.ts',
    ]);

    expect(plan).toEqual({
      jestTestPaths: ['apps/webapp/src/script/featureToggles/startupFeatureToggles.test.ts'],
      skippedPlaywrightPaths: ['apps/webapp/test/e2e_tests/specs/Drive/drive.spec.ts'],
    });
  });

  it('returns an empty plan when no test paths changed', () => {
    expect(partitionAffectedJestTests([])).toEqual({jestTestPaths: [], skippedPlaywrightPaths: []});
  });

  it('identifies when all affected test files are Playwright E2E files', () => {
    const plan = partitionAffectedJestTests(['apps/webapp/test/e2e_tests/specs/Drive/drive.spec.ts']);

    expect(plan.jestTestPaths).toEqual([]);
    expect(plan.skippedPlaywrightPaths).toEqual(['apps/webapp/test/e2e_tests/specs/Drive/drive.spec.ts']);
  });

  it('keeps Jest spec files outside the Playwright E2E tree', () => {
    const plan = partitionAffectedJestTests(['libraries/config/src/client.config.spec.ts']);

    expect(plan).toEqual({
      jestTestPaths: ['libraries/config/src/client.config.spec.ts'],
      skippedPlaywrightPaths: [],
    });
  });
});
