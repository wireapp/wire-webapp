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

import {APIClient} from '../APIClient';
import {LoginData} from '../auth';
import {ClientType} from '../client';
import {Config} from '../Config';

require('dotenv').config();

export async function initClient(): Promise<APIClient> {
  const credentials: LoginData = {
    clientType: ClientType.TEMPORARY,
    email: process.env.WIRE_EMAIL,
    password: process.env.WIRE_PASSWORD,
  };

  const apiConfig: Config = {
    urls: {
      name: 'default',
      rest: process.env.WIRE_BACKEND_REST!,
      ws: process.env.WIRE_BACKEND_WS!,
    },
  };

  const apiClient = new APIClient(apiConfig);

  await apiClient.login(credentials);

  return apiClient;
}
