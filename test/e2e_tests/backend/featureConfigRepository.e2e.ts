/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {FEATURE_KEY} from '@wireapp/api-client/lib/team/feature';

import {BackendClientE2E} from './backendClient.e2e';
export class FeatureConfigRepositoryE2E extends BackendClientE2E {
  async isFeatureEnabled(token: string, featureKey: FEATURE_KEY): Promise<boolean> {
    const response = await this.axiosInstance.get(`feature-configs/${featureKey}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.status === 'enabled';
  }
}
