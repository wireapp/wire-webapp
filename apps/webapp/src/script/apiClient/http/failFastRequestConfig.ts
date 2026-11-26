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

import type {AxiosRequestConfig} from 'axios';

/**
 * Request settings for callers that decide about retries themselves, such as the outbox:
 * one attempt, without the infinite network retry or the incremental backoff of the HTTP client.
 */
export const failFastRequestConfig: Partial<AxiosRequestConfig> = {
  'axios-retry': {
    retries: 0,
  },
  requestOptions: {
    skipIncrementalRetryBackoff: true,
  },
};

export type RequestRetryOptions = {
  /** Make a single attempt and let the caller handle a failure (see {@link failFastRequestConfig}) */
  readonly failFast?: boolean;
};

export function getRetryRequestConfig({failFast}: RequestRetryOptions): Partial<AxiosRequestConfig> {
  return failFast === true ? failFastRequestConfig : {};
}
