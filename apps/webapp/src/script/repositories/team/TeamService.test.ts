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

import {FEATURE_STATUS} from '@wireapp/api-client/lib/team/feature/';

import {APIClient} from '../../service/apiClientSingleton';

import {TeamService} from './TeamService';

describe('TeamService', () => {
  it('keeps the last known features when a refresh request fails', async () => {
    const getAllFeatures = jest.fn().mockRejectedValue(new Error('Backend unavailable'));
    const apiClient = {api: {teams: {feature: {getAllFeatures}}}} as unknown as APIClient;
    const service = new TeamService(apiClient);
    const previousFeatures = {
      appLock: {
        status: FEATURE_STATUS.ENABLED,
        config: {enforceAppLock: true, inactivityTimeoutSecs: 60},
      },
    };

    await expect(service.getAllTeamFeatures(previousFeatures)).resolves.toBe(previousFeatures);
  });
});
