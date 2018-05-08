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

import {AxiosRequestConfig, AxiosResponse} from 'axios';

import {PreKeyBundle} from '../auth';
import {NewClient, RegisteredClient} from '../client/index';
import {HttpClient} from '../http';

class ClientAPI {
  constructor(private client: HttpClient) {}

  static get URL() {
    return {
      CLIENTS: '/clients',
    };
  }

  public postClient(newClient: NewClient): Promise<RegisteredClient> {
    const config: AxiosRequestConfig = {
      data: newClient,
      method: 'post',
      url: ClientAPI.URL.CLIENTS,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  public deleteClient(clientId: string, password?: string): Promise<Object> {
    const config: AxiosRequestConfig = {
      data: {
        password,
      },
      method: 'delete',
      url: `${ClientAPI.URL.CLIENTS}/${clientId}`,
    };

    return this.client.sendJSON(config).then(() => ({}));
  }

  public getClient(clientId: string): Promise<RegisteredClient> {
    const config: AxiosRequestConfig = {
      data: {},
      method: 'get',
      url: `${ClientAPI.URL.CLIENTS}/${clientId}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  public getClients(): Promise<RegisteredClient[]> {
    const config: AxiosRequestConfig = {
      data: {},
      method: 'get',
      url: ClientAPI.URL.CLIENTS,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  public getClientPreKeys(clientId: string): Promise<PreKeyBundle> {
    const config: AxiosRequestConfig = {
      data: {},
      method: 'get',
      url: `${ClientAPI.URL.CLIENTS}/${clientId}/prekeys`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }
}

export {ClientAPI};
