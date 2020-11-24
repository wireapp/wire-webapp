/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {BackendErrorLabel, HttpClient} from '../../http';
import {FeatureAppLock, FeatureDigitalSignature, FeatureSSO} from './Feature';
import {InvalidAppLockTimeoutError} from './FeatureError';
import {FeatureList} from './FeatureList';

export class FeatureAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    APPLOCK: 'appLock',
    DIGITAL_SIGNATURES: 'digitalSignatures',
    FEATURES: 'features',
    SSO: 'sso',
    TEAMS: '/teams',
  };

  public async getAllFeatures(teamId: string): Promise<FeatureList> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/`,
    };

    const response = await this.client.sendJSON<FeatureList>(config);
    return response.data;
  }

  public async getSSOFeature(teamId: string): Promise<FeatureSSO> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.SSO}`,
    };

    const response = await this.client.sendJSON<FeatureSSO>(config);
    return response.data;
  }

  public async getDigitalSignatureFeature(teamId: string): Promise<FeatureDigitalSignature> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.DIGITAL_SIGNATURES}`,
    };

    const response = await this.client.sendJSON<FeatureDigitalSignature>(config);
    return response.data;
  }

  public async getAppLockFeature(teamId: string): Promise<FeatureAppLock> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.APPLOCK}`,
    };

    const response = await this.client.sendJSON<FeatureAppLock>(config);
    return response.data;
  }

  public async putAppLockFeature(teamId: string, appLockFeature: FeatureAppLock): Promise<FeatureAppLock> {
    const config: AxiosRequestConfig = {
      data: appLockFeature,
      method: 'put',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.APPLOCK}`,
    };

    try {
      const response = await this.client.sendJSON<FeatureAppLock>(config);
      return response.data;
    } catch (error) {
      switch (error.label) {
        case BackendErrorLabel.APP_LOCK_INVALID_TIMEOUT: {
          throw new InvalidAppLockTimeoutError(error.message);
        }
      }
      throw error;
    }
  }
}
