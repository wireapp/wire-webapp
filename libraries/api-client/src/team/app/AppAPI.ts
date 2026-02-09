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

import {AxiosRequestConfig} from 'axios';

import {NewAppRequest} from './NewAppRequest';
import {NewAppResponse} from './NewAppResponse';

import {HttpClient} from '../../http';
import {TeamAPI} from '../team';

export class AppAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    APPS: 'apps',
  };

  public async postApp(teamId: string, app: NewAppRequest): Promise<NewAppResponse> {
    const config: AxiosRequestConfig = {
      data: app,
      method: 'POST',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${AppAPI.URL.APPS}`,
    };

    const response = await this.client.sendJSON<NewAppResponse>(config);
    return response.data;
  }
}
