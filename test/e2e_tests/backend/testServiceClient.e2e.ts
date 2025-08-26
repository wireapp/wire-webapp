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

import axios, {AxiosInstance} from 'axios';

export class TestServiceClientE2E {
  private readonly axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: process.env.TEST_SERVICE_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async createInstance(password: string, email: string, deviceName: string, developmentApiEnabled: boolean) {
    const response = await this.axiosInstance.put('/api/v1/instance', {
      password,
      name: 'Generic Test Name',
      backend: 'staging',
      developmentApiEnabled,
      deviceName,
      email,
    });
    return response.data;
  }

  async sendText(instanceId: string, conversationId: string, text: string) {
    return await this.axiosInstance.post(`/api/v1/instance/${instanceId}/sendText`, {
      legalHoldStatus: 1,
      conversationId,
      text,
    });
  }
}
