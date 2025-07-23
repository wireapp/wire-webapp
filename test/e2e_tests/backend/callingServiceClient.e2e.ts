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

export class CallingServiceClientE2E {
  private readonly axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: process.env.CALLING_SERVICE_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${process.env.CALLING_SERVICE_BASIC_AUTH}`,
      },
    });
  }

  async createInstance(password: string, email: string) {
    const response = await this.axiosInstance.post('/api/v1/instance/create', {
      email,
      password,
      verificationCode: '',
      backend: 'MASTER',
      customBackend: {
        name: 'staging',
        webappUrl: 'https://wire-webapp-dev.zinfra.io/',
        backendUrl: 'https://staging-nginz-https.zinfra.io/',
        websocketUrl: 'wss://staging-nginz-ssl.zinfra.io',
      },
      instanceType: {
        name: 'chrome',
        version: '103.0.5060.53',
        path: '/chrome/Contents/MacOS/Google Chrome',
        zcall: false,
        firefox: false,
        chrome: true,
      },
      name: 'Webapp_chrome: \nGroup Video call 0',
      timeout: 600000,
      beta: true,
    });
    return response.data;
  }

  async getStatus(instanceId: string) {
    const response = await this.axiosInstance.get(`/api/v1/instance/${instanceId}/status`);
    return response.data;
  }

  async setAcceptNextCall(instanceId: string, timeout: number = 7200000) {
    return await this.axiosInstance.post(`/api/v1/instance/${instanceId}/call/acceptNext`, {
      conversationId: '',
      timeout,
    });
  }

  async getFlows(instanceId: string) {
    const response = await this.axiosInstance.get(`/api/v1/instance/${instanceId}/flows`);
    return response.data[0] as Flow;
  }

  async verifyAudioIsBeingReceived(instanceId: string) {
    return this.verifyFlowChange(
      instanceId,
      false, // checkAudioSent
      true, // checkAudioRecv
      false, // checkVideoSent
      false, // checkVideoRecv
    );
  }

  async verifyVideoIsBeingReceived(instanceId: string) {
    return this.verifyFlowChange(
      instanceId,
      false, // checkAudioSent
      false, // checkAudioRecv
      false, // checkVideoSent
      true, // checkVideoRecv
    );
  }

  async verifyFlowChange(
    instanceId: string,
    checkAudioSent: boolean,
    checkAudioRecv: boolean,
    checkVideoSent: boolean,
    checkVideoRecv: boolean,
  ) {
    const flowBefore = await this.getFlows(instanceId);

    const timeout = 30_000;
    const delayBetweenChecks = 2000;
    const maxChecks = timeout / delayBetweenChecks;

    for (let currentCheck = 0; currentCheck < maxChecks; currentCheck++) {
      const flowAfter = await this.getFlows(instanceId);

      const after_as = !checkAudioSent || flowAfter.audioPacketsSent > flowBefore.audioPacketsSent;
      const after_ar = !checkAudioRecv || flowAfter.audioPacketsReceived > flowBefore.audioPacketsReceived;
      const after_vs = !checkVideoSent || flowAfter.videoPacketsSent > flowBefore.videoPacketsSent;
      const after_vr = !checkVideoRecv || flowAfter.videoPacketsReceived > flowBefore.videoPacketsReceived;

      if (after_as && after_ar && after_vs && after_vr) {
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, delayBetweenChecks));
    }

    throw new Error(`Expected flow data has not changed after timeout of ${timeout}ms.`);
  }
}

interface Flow {
  audioPacketsReceived: number;
  audioPacketsSent: number;
  videoPacketsReceived: number;
  videoPacketsSent: number;
  remoteUserId: string;
}
