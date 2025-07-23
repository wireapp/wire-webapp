/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {MINIMUM_API_VERSION} from '@wireapp/api-client/lib/Config';
import axios, {AxiosInstance} from 'axios';

const TEST_API_VERSION = `v${MINIMUM_API_VERSION}`;
export class BackendClientE2E {
  readonly axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: `${process.env.BACKEND_URL}${TEST_API_VERSION}/`,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
