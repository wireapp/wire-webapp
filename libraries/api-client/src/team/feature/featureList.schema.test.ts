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

import {allFeaturesResponseSchema} from './featureList.schema';
import {FEATURE_STATUS} from './featureList.types';

describe('manual migration feature parsing', () => {
  it.each([true, false])('preserves allowManualMigration=%s', allowManualMigration => {
    const response = allFeaturesResponseSchema.parse({
      mlsMigration: {status: FEATURE_STATUS.ENABLED, config: {allowManualMigration}},
    });
    expect(response.mlsMigration?.config.allowManualMigration).toBe(allowManualMigration);
  });

  it('accepts older backends without manual migration permission', () => {
    const response = allFeaturesResponseSchema.parse({mlsMigration: {status: FEATURE_STATUS.ENABLED, config: {}}});
    expect(response.mlsMigration?.config.allowManualMigration).toBeUndefined();
    expect(allFeaturesResponseSchema.parse({}).mlsMigration).toBeUndefined();
  });
});
