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

import {IdentityProvider} from './IdentityProvider';
import {IdentityProviders} from './IdentityProviders';

import {HttpClient} from '../../http';

export class IdentityProviderAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    METADATA: 'metadata',
    PROVIDER: '/identity-providers',
    SSO: '/sso',
  };

  public async getIdentityProvider(identityProviderId: string): Promise<IdentityProvider> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${IdentityProviderAPI.URL.PROVIDER}/${identityProviderId}`,
    };

    const response = await this.client.sendJSON<IdentityProvider>(config);
    return response.data;
  }

  public async getIdentityProviders(): Promise<IdentityProviders> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${IdentityProviderAPI.URL.PROVIDER}`,
    };

    const response = await this.client.sendJSON<IdentityProviders>(config);
    return response.data;
  }

  public async deleteIdentityProvider(identityProviderId: string, purge?: boolean): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: `${IdentityProviderAPI.URL.PROVIDER}/${identityProviderId}`,
    };

    if (purge) {
      config.params = {purge};
    }

    await this.client.sendJSON(config);
  }

  public async postIdentityProvider(identityData: string, replaceProviderId?: string): Promise<IdentityProvider> {
    const config: AxiosRequestConfig = {
      data: identityData,
      method: 'post',
      url: `${IdentityProviderAPI.URL.PROVIDER}`,
    };

    if (replaceProviderId) {
      config.params = {replaces: replaceProviderId};
    }

    const response = await this.client.sendXML<IdentityProvider>(config);
    return response.data;
  }

  public async putIdentityProvider(identityProviderId: string, identityData: string): Promise<IdentityProvider> {
    const config: AxiosRequestConfig = {
      data: identityData,
      method: 'put',
      url: `${IdentityProviderAPI.URL.PROVIDER}/${identityProviderId}`,
    };

    const response = await this.client.sendXML<IdentityProvider>(config);
    return response.data;
  }

  public async getMetadata(): Promise<string> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${IdentityProviderAPI.URL.SSO}/${IdentityProviderAPI.URL.METADATA}`,
    };

    const response = await this.client.sendJSON<string>(config);
    return response.data;
  }
}
