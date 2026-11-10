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

import {FEATURE_STATUS, FeatureList} from '@wireapp/api-client/lib/team';
import type {AxiosResponse} from 'axios';

import {TeamService} from './TeamService';
import {APIClient} from '../../service/apiClientSingleton';

describe('TeamService feature responses', () => {
  it.each([FEATURE_STATUS.ENABLED, FEATURE_STATUS.DISABLED])(
    'returns the explicitly supplied %s feature response through the real API client',
    async status => {
      using apiClient = new APIClient();
      const teamService = new TeamService(apiClient);
      const featureResponse: FeatureList = {fileSharing: {status}};
      const sendJSON = jest
        .spyOn(apiClient.transport.http, 'sendJSON')
        .mockResolvedValue({data: featureResponse} as AxiosResponse<FeatureList>);

      const actualFeatures = await teamService.getAllTeamFeatures();

      expect(actualFeatures).toEqual(featureResponse);
      expect(sendJSON).toHaveBeenCalledTimes(1);
      expect(sendJSON).toHaveBeenCalledWith({method: 'get', url: '/feature-configs'});
    },
  );

  it('rejects with the original error when the explicitly controlled HTTP request fails', async () => {
    using apiClient = new APIClient();
    const teamService = new TeamService(apiClient);
    const error = new Error('Feature endpoint unavailable');
    jest.spyOn(apiClient.transport.http, 'sendJSON').mockRejectedValue(error);

    await expect(teamService.getAllTeamFeatures()).rejects.toBe(error);
  });

  it('provides compatibility defaults for initial loading', () => {
    using apiClient = new APIClient();
    const teamService = new TeamService(apiClient);
    const defaults = teamService.getDefaultTeamFeatures();

    expect(defaults.appLock).toEqual({
      status: FEATURE_STATUS.ENABLED,
      config: {enforceAppLock: false, inactivityTimeoutSecs: 60},
    });
    expect(defaults.fileSharing).toEqual({status: FEATURE_STATUS.ENABLED});
    expect(defaults.mls).toBeUndefined();
  });
});
