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

import {BackendClientE2E} from './backendClient.e2e';
import type {AxiosResponse} from 'axios';

const domain = process.env.DOMAIN;

type GetConnectionsListResult = Promise<AxiosResponse<any, {page_state: string}, {}, any>>;
export class ConnectionRepositoryE2E extends BackendClientE2E {
  async getConnectionsList(token: string): GetConnectionsListResult {
    const response = await this.axiosInstance.post(
      'list-connections',
      {
        page_state: '',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
    return response;
  }

  async sendConnectionRequest(token: string, inviteeId: string): Promise<void> {
    await this.axiosInstance.post(
      `connections/${domain}/${inviteeId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async acceptConnectionRequest(token: string, connectionId: string): Promise<void> {
    await this.axiosInstance.post(
      `connections/${domain}/${connectionId}`,
      {
        status: 'accepted',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
