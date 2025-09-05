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

import {FeatureList, FEATURE_KEY, FeatureStatus} from '@wireapp/api-client/lib/team/feature';

import {BackendClientE2E} from './backendClient.e2e';

import {User} from '../data/user';

export class FeatureConfigRepositoryE2E extends BackendClientE2E {
  async isFeatureEnabled(token: string, FeatureKey: FEATURE_KEY): Promise<boolean> {
    const response = await this.axiosInstance.get<FeatureList>('feature-configs', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data[FeatureKey]?.status === FeatureStatus.ENABLED;
  }

  async changeStateSndFactorPasswordChallenge(user: User, teamId: string, status: string) {
    await this.axiosInstance.request({
      url: `teams/${teamId}/features/sndFactorPasswordChallenge`,
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
      data: {
        status: status,
        lockStatus: 'locked',
      },
    });
  }
}
