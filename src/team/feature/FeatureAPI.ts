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

import type {AxiosRequestConfig} from 'axios';

import {BackendError, BackendErrorLabel, HttpClient} from '../../http';
import {InvalidAppLockTimeoutError} from './FeatureError';
import type {
  FeatureAppLock,
  FeatureVideoCalling,
  FeatureConferenceCalling,
  FeatureDigitalSignature,
  FeatureLegalhold,
  FeatureSSO,
  FeatureFileSharing,
} from './Feature';
import type {FeatureList} from './FeatureList';

export class FeatureAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    APPLOCK: 'appLock',
    CALLING_CONFERENCE: 'conferenceCalling',
    CALLING_VIDEO: 'videoCalling',
    DIGITAL_SIGNATURES: 'digitalSignatures',
    FEATURE_CONFIGS: '/feature-configs',
    FEATURES: 'features',
    FILE_SHARING: 'fileSharing',
    LEGAL_HOLD: 'legalhold',
    SSO: 'sso',
    TEAMS: '/teams',
  };

  public async getAllFeatures(): Promise<FeatureList> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: FeatureAPI.URL.FEATURE_CONFIGS,
    };

    const response = await this.client.sendJSON<FeatureList>(config);
    return response.data;
  }

  /**
   * @deprecated Use `getAllFeatures()` instead.
   */
  public async getAllTeamFeatures(teamId: string): Promise<FeatureList> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}`,
    };

    const response = await this.client.sendJSON<FeatureList>(config);
    return response.data;
  }

  public async getLegalholdFeature(): Promise<FeatureLegalhold> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.FEATURE_CONFIGS}/${FeatureAPI.URL.LEGAL_HOLD}`,
    };

    const response = await this.client.sendJSON<FeatureLegalhold>(config);
    return response.data;
  }

  public async getConferenceCallingFeature(): Promise<FeatureConferenceCalling> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.FEATURE_CONFIGS}/${FeatureAPI.URL.CALLING_CONFERENCE}`,
    };

    const response = await this.client.sendJSON<FeatureConferenceCalling>(config);
    return response.data;
  }

  public async putConferenceCallingFeature(
    teamId: string,
    conferenceCallingFeature: FeatureConferenceCalling,
  ): Promise<FeatureConferenceCalling> {
    const config: AxiosRequestConfig = {
      data: conferenceCallingFeature,
      method: 'put',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.CALLING_CONFERENCE}`,
    };

    const response = await this.client.sendJSON<FeatureConferenceCalling>(config);
    return response.data;
  }

  public async getVideoCallingFeature(): Promise<FeatureVideoCalling> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.FEATURE_CONFIGS}/${FeatureAPI.URL.CALLING_VIDEO}`,
    };

    const response = await this.client.sendJSON<FeatureConferenceCalling>(config);
    return response.data;
  }

  public async putVideoCallingFeature(
    teamId: string,
    videoCallingFeature: FeatureVideoCalling,
  ): Promise<FeatureVideoCalling> {
    const config: AxiosRequestConfig = {
      data: videoCallingFeature,
      method: 'put',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.CALLING_VIDEO}`,
    };

    const response = await this.client.sendJSON<FeatureVideoCalling>(config);
    return response.data;
  }

  public async getFileSharingFeature(): Promise<FeatureFileSharing> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.FEATURE_CONFIGS}/${FeatureAPI.URL.FILE_SHARING}`,
    };

    const response = await this.client.sendJSON<FeatureFileSharing>(config);
    return response.data;
  }

  public async putFileSharingFeature(
    teamId: string,
    fileSharingFeature: FeatureFileSharing,
  ): Promise<FeatureFileSharing> {
    const config: AxiosRequestConfig = {
      data: fileSharingFeature,
      method: 'put',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.FILE_SHARING}`,
    };

    const response = await this.client.sendJSON<FeatureFileSharing>(config);
    return response.data;
  }

  public async getSSOFeature(): Promise<FeatureSSO> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.FEATURE_CONFIGS}/${FeatureAPI.URL.SSO}`,
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

  public async getAppLockFeature(): Promise<FeatureAppLock> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.FEATURE_CONFIGS}/${FeatureAPI.URL.APPLOCK}`,
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
      switch ((error as BackendError).label) {
        case BackendErrorLabel.APP_LOCK_INVALID_TIMEOUT: {
          throw new InvalidAppLockTimeoutError((error as BackendError).message);
        }
      }
      throw error;
    }
  }
}
