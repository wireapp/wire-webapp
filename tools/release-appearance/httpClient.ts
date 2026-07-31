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

import ky from 'ky';
import type {KyInstance, Options} from 'ky';
import {Maybe} from 'true-myth';

export type HttpMethod = 'get' | 'post' | 'patch';

export type HttpRequest = {
  readonly method: HttpMethod;
  readonly url: URL;
  readonly headers: Readonly<Record<string, string>>;
  readonly json: Maybe<NonNullable<unknown>>;
};

export type HttpClient = {
  readonly requestJson: (request: HttpRequest) => Promise<unknown>;
};

export type CreateKyHttpClientOptions = {
  readonly kyInstance: KyInstance;
};

export function createKyHttpClient(createKyHttpClientOptions: CreateKyHttpClientOptions): HttpClient {
  const {kyInstance} = createKyHttpClientOptions;

  return {
    async requestJson(request): Promise<unknown> {
      const requestOptions: Options = request.json
        .map(json => {
          return {
            method: request.method,
            headers: request.headers,
            json,
            retry: {limit: 0},
          };
        })
        .unwrapOr({
          method: request.method,
          headers: request.headers,
          retry: {limit: 0},
        });

      return kyInstance(request.url, requestOptions).json<unknown>();
    },
  };
}

export function createRuntimeKyHttpClient(): HttpClient {
  return createKyHttpClient({kyInstance: ky});
}
