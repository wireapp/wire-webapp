/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {NewScimToken} from './NewScimToken';
import {ScimTokenInfoList} from './ScimTokenInfoList';

import {HttpClient} from '../../http';

export class ScimAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    AUTH_TOKENS: 'auth-tokens',
    SCIM: '/scim',
  };

  public async getTokens(): Promise<ScimTokenInfoList> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${ScimAPI.URL.SCIM}/${ScimAPI.URL.AUTH_TOKENS}`,
    };

    const response = await this.client.sendJSON<ScimTokenInfoList>(config);
    return response.data;
  }

  public async deleteToken(scimTokenId: string): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'delete',
      params: {id: scimTokenId},
      url: `${ScimAPI.URL.SCIM}/${ScimAPI.URL.AUTH_TOKENS}`,
    };

    await this.client.sendJSON(config);
  }

  public async postToken(
    description: string,
    idp?: string,
    name?: string,
    password?: string,
    verificationCode?: string,
  ): Promise<NewScimToken> {
    const config: AxiosRequestConfig = {
      data: {
        description,
        password,
        ...(idp && {idp}),
        ...(name && {name}),
        ...(verificationCode && {verification_code: verificationCode}),
      },
      method: 'post',
      url: `${ScimAPI.URL.SCIM}/${ScimAPI.URL.AUTH_TOKENS}`,
    };

    const response = await this.client.sendJSON<NewScimToken>(config);
    return response.data;
  }
}
