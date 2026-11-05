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

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import type {HttpClient} from '@wireapp/api-client/lib/http/httpClient';
import type {AxiosRequestConfig} from 'axios';

import {createTwoFactorApi} from './twoFactorApi';

describe('TOTP API contract', () => {
  it('sends v19 requests, UTC timestamps, and the documented authentication payloads', async () => {
    const requests: AxiosRequestConfig[] = [];
    const client = {
      sendJSON: async (config: AxiosRequestConfig) => {
        requests.push(config);
        return {data: {codes: []}};
      },
    } as unknown as Pick<HttpClient, 'sendJSON'>;
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const api = createTwoFactorApi(client, clock);
    await api.list();
    await api.enrol('Work phone', {password: 'password', totp_code: 'totp:012345'});
    clock.advanceByMilliseconds(1000);
    await api.activate('credential-id', '014921');
    await api.rename('credential-id', 'Backup');
    await api.remove('credential-id', {password: 'password', totp_code: 'recovery:3MK7-9WQX-0V2H-8TZB'});
    expect(requests).toEqual([
      {requestOptions: {apiVersion: 19}, method: 'get', url: '/self/totp'},
      {
        requestOptions: {apiVersion: 19},
        method: 'post',
        url: '/self/totp',
        data: {
          name: 'Work phone',
          password: 'password',
          totp_code: 'totp:012345',
          client_time: '1970-01-01T00:00:00.000Z',
        },
      },
      {
        requestOptions: {apiVersion: 19},
        method: 'post',
        url: '/self/totp/credential-id/activate',
        data: {code: '014921', client_time: '1970-01-01T00:00:01.000Z'},
      },
      {requestOptions: {apiVersion: 19}, method: 'put', url: '/self/totp/credential-id', data: {name: 'Backup'}},
      {
        requestOptions: {apiVersion: 19},
        method: 'delete',
        url: '/self/totp/credential-id',
        data: {password: 'password', totp_code: 'recovery:3MK7-9WQX-0V2H-8TZB'},
      },
    ]);
  });
});
