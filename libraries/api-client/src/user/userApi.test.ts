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

import {AxiosRequestConfig, AxiosResponse} from 'axios';

import type {BackendFeatures} from '../apiClient';
import {VerificationActionType} from '../auth/verificationActionType';
import type {HttpClient} from '../http/httpClient';

import {UserAPI} from './userApi';

describe('UserAPI', () => {
  it('opts out of incremental retry backoff when generating a verification code', async () => {
    const sentRequestConfigs: AxiosRequestConfig[] = [];
    const emailAddress = 'user@example.com';
    const httpClient = {
      sendJSON: async function sendJSON<ResponseData>(
        requestConfig: AxiosRequestConfig,
      ): Promise<AxiosResponse<ResponseData>> {
        sentRequestConfigs.push(requestConfig);
        return undefined as never;
      },
    } as unknown as HttpClient;
    const backendFeatures: BackendFeatures = {
      domain: 'test.zinfra.io',
      federationEndpoints: false,
      isFederated: false,
      supportsGuestLinksWithPassword: false,
      supportsMLS: false,
      version: 0,
    };
    const userAPI = new UserAPI(httpClient, backendFeatures);

    await userAPI.postVerificationCode(emailAddress, VerificationActionType.LOGIN);

    const [actualRequestConfig] = sentRequestConfigs;
    const expectedRequestConfig = expect.objectContaining({
      data: {action: VerificationActionType.LOGIN, email: emailAddress},
      method: 'post',
      requestOptions: {skipIncrementalRetryBackoff: true},
      url: '/verification-code/send',
    });

    expect(sentRequestConfigs).toHaveLength(1);
    expect(actualRequestConfig).toEqual(expectedRequestConfig);
  });
});
