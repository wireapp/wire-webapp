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
import {ACCESS_TYPE, FEATURE_STATUS} from './featureList.types';

describe('allFeaturesResponseSchema', () => {
  it('validates known feature configuration with its specific inferred fields', () => {
    const response = allFeaturesResponseSchema.parse({
      channels: {
        status: FEATURE_STATUS.ENABLED,
        config: {
          allowed_to_create_channels: ACCESS_TYPE.ADMINS,
          allowed_to_open_channels: ACCESS_TYPE.EVERYONE,
        },
      },
    });

    expect(response.channels?.config.allowed_to_create_channels).toBe(ACCESS_TYPE.ADMINS);
    expect(response.channels?.config.allowed_to_open_channels).toBe(ACCESS_TYPE.EVERYONE);
  });

  it('accepts and preserves unknown feature keys', () => {
    const unknownFeature = {status: 'enabled', rollout: {enabled: true}};
    const response = allFeaturesResponseSchema.parse({nextFeature: unknownFeature});

    expect(response.nextFeature).toStrictEqual(unknownFeature);
  });
});

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
