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

import {AxiosRequestConfig} from 'axios';

import {HttpClient} from '../../http/';

import {Provider, Service, ServiceWhitelistData, Services} from './';

export class ServiceAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    PROVIDERS: '/providers',
    SERVICES: 'services',
    TEAMS: '/teams',
    WHITELIST: 'whitelist',
    WHITELISTED: 'whitelisted',
  };

  public async getServices(limit: number = 100, start?: string, tags?: string[] | string): Promise<Services> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {
        size: limit,
        start,
        tags,
      },
      url: `/${ServiceAPI.URL.SERVICES}`,
    };

    const response = await this.client.sendJSON<Services>(config);
    return response.data;
  }

  public async getTeamServices(teamId: string, limit: number = 100): Promise<Services> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {
        prefix: undefined,
        size: limit,
        start: undefined,
      },
      url: `${ServiceAPI.URL.TEAMS}/${teamId}/${ServiceAPI.URL.SERVICES}/${ServiceAPI.URL.WHITELISTED}`,
    };

    const response = await this.client.sendJSON<Services>(config);
    return response.data;
  }

  public async getProvider(providerId: string): Promise<Provider> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${ServiceAPI.URL.PROVIDERS}/${providerId}`,
    };

    const response = await this.client.sendJSON<Provider>(config);
    return response.data;
  }

  public async getProviderServices(providerId: string): Promise<Services> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${ServiceAPI.URL.PROVIDERS}/${providerId}/${ServiceAPI.URL.SERVICES}`,
    };

    const response = await this.client.sendJSON<Services>(config);
    return response.data;
  }

  public async getService(providerId: string, serviceId: string): Promise<Service> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${ServiceAPI.URL.PROVIDERS}/${providerId}/${ServiceAPI.URL.SERVICES}/${serviceId}`,
    };

    const response = await this.client.sendJSON<Service>(config);
    return response.data;
  }

  public async postServiceWhitelist(teamId: string, whitelistData: ServiceWhitelistData): Promise<Services> {
    const config: AxiosRequestConfig = {
      data: whitelistData,
      method: 'post',
      url: `${ServiceAPI.URL.TEAMS}/${teamId}/${ServiceAPI.URL.SERVICES}/${ServiceAPI.URL.WHITELIST}`,
    };

    const response = await this.client.sendJSON<Services>(config);
    return response.data;
  }
}
