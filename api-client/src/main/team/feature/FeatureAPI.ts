/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {AxiosRequestConfig} from 'axios';

import {HttpClient} from '../../http';
import {IdentityProviderStatus} from './IdentityProviderStatus';

export class FeatureAPI {
  constructor(private readonly client: HttpClient) {}

  static URL = {
    FEATURES: 'features',
    SSO: 'sso',
    TEAMS: '/teams',
  };

  public async getIdentityProviderStatus(teamId: string): Promise<IdentityProviderStatus> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.SSO}`,
    };

    const response = await this.client.sendJSON<IdentityProviderStatus>(config);
    return response.data;
  }
}
