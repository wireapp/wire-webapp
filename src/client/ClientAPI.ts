/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import type {PreKeyBundle} from '../auth/';
import type {NewClient, RegisteredClient, UpdatedClient} from '../client/';
import {ClientCapabilityRemovedError} from './ClientError';
import {BackendErrorLabel, HttpClient} from '../http/';
import {ClientCapabilityData} from './ClientCapabilityData';

export class ClientAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    CLIENTS: '/clients',
    CAPABILITIES: 'capabilities',
  };

  public async postClient(newClient: NewClient): Promise<RegisteredClient> {
    const config: AxiosRequestConfig = {
      data: newClient,
      method: 'post',
      url: ClientAPI.URL.CLIENTS,
    };

    const response = await this.client.sendJSON<RegisteredClient>(config);
    return response.data;
  }

  public async putClient(clientId: string, updatedClient: UpdatedClient): Promise<void> {
    const config: AxiosRequestConfig = {
      data: updatedClient,
      method: 'put',
      url: `${ClientAPI.URL.CLIENTS}/${clientId}`,
    };

    try {
      await this.client.sendJSON(config);
    } catch (error) {
      switch (error.label) {
        case BackendErrorLabel.CLIENT_CAPABILITY_REMOVED: {
          throw new ClientCapabilityRemovedError(error.message);
        }
      }
      throw error;
    }
  }

  public async getClientCapabilities(clientId: string): Promise<ClientCapabilityData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${ClientAPI.URL.CLIENTS}/${clientId}/${ClientAPI.URL.CAPABILITIES}`,
    };

    const response = await this.client.sendJSON<ClientCapabilityData>(config);
    return response.data;
  }

  public async deleteClient(clientId: string, password?: string): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        password,
      },
      method: 'delete',
      url: `${ClientAPI.URL.CLIENTS}/${clientId}`,
    };

    await this.client.sendJSON(config);
  }

  public async getClient(clientId: string): Promise<RegisteredClient> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${ClientAPI.URL.CLIENTS}/${clientId}`,
    };

    const response = await this.client.sendJSON<RegisteredClient>(config);
    return response.data;
  }

  public async getClients(): Promise<RegisteredClient[]> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: ClientAPI.URL.CLIENTS,
    };

    const response = await this.client.sendJSON<RegisteredClient[]>(config);
    return response.data;
  }

  public async getClientPreKeys(clientId: string): Promise<PreKeyBundle> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${ClientAPI.URL.CLIENTS}/${clientId}/prekeys`,
    };

    const response = await this.client.sendJSON<PreKeyBundle>(config, true);
    return response.data;
  }
}
