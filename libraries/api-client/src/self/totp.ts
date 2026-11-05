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

import type {HttpClient} from '../http/httpClient';

export interface TotpCredential {
  id: string;
  name: string;
  created_at: string;
  activated_at?: string | null;
}

export interface TotpReauthentication {
  password?: string;
  totp_code?: `totp:${string}` | `recovery:${string}`;
}

export interface TotpEnrolment {
  credential_id: string;
  secret: string;
  uri: string;
  algorithm: 'sha1' | 'sha256' | 'sha512';
  digits: number;
  period: number;
  server_time: string;
  expires_at: string;
}

export interface NewTotpCredential extends TotpReauthentication {
  name: string;
  client_time: string;
}

export interface ActivateTotpCredential {
  code: string;
  client_time: string;
}

/** TOTP is available from v19; retain the configured backend and authenticated transport. */
export const createTotpApi = (client: Pick<HttpClient, 'sendJSON'>) => {
  const requestOptions = {apiVersion: 19};
  const credentialUrl = (id: string) => {
    return `/self/totp/${encodeURIComponent(id)}`;
  };
  return {
    async list(): Promise<TotpCredential[]> {
      const response = await client.sendJSON<TotpCredential[]>({requestOptions, method: 'get', url: '/self/totp'});
      return response.data;
    },
    async enrol(data: NewTotpCredential): Promise<TotpEnrolment> {
      const response = await client.sendJSON<TotpEnrolment>({requestOptions, method: 'post', url: '/self/totp', data});
      return response.data;
    },
    async activate(id: string, data: ActivateTotpCredential): Promise<{codes: string[]}> {
      const response = await client.sendJSON<{codes: string[]}>({
        requestOptions,
        method: 'post',
        url: `${credentialUrl(id)}/activate`,
        data,
      });
      return response.data;
    },
    async rename(id: string, name: string): Promise<void> {
      await client.sendJSON({requestOptions, method: 'put', url: credentialUrl(id), data: {name}});
    },
    async remove(id: string, data: TotpReauthentication): Promise<void> {
      await client.sendJSON({requestOptions, method: 'delete', url: credentialUrl(id), data});
    },
  };
};
