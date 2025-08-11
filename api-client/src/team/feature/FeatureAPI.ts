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

import {
  FeatureAppLock,
  FeatureVideoCalling,
  FeatureConferenceCalling,
  FeatureDigitalSignature,
  FeatureLegalhold,
  FeatureSSO,
  FeatureFileSharing,
  FeatureSelfDeletingMessages,
  FeatureSndFactorPassword,
  FeatureMLS,
  FeatureMLSE2EId,
  FeatureMLSMigration,
  FeatureDownloadPath,
  FeatureDomainRegistration,
  FeatureChannels,
  FeatureCells,
  FeatureAllowedGlobalOperations,
  FeatureConsumableNotifications,
} from './Feature';
import {InvalidAppLockTimeoutError} from './FeatureError';
import {FeatureList} from './FeatureList';

import {BackendError, BackendErrorLabel, HttpClient} from '../../http';

import {FeatureConversationGuestLink, FeatureLockedError} from '.';

export class FeatureAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    APPLOCK: 'appLock',
    ALLOWED_GLOBAL_OPERATIONS: 'allowedGlobalOperations',
    CALLING_CONFERENCE: 'conferenceCalling',
    CALLING_VIDEO: 'videoCalling',
    CONSUMABLE_NOTIFICATIONS: 'consumableNotifications',
    SELF_DELETING_MESSAGES: 'selfDeletingMessages',
    DIGITAL_SIGNATURES: 'digitalSignatures',
    DOMAIN_REGISTRATION: 'domainRegistration',
    DL_PATH: 'enforceFileDownloadLocation',
    CELLS: 'cells',
    CHANNELS: 'channels',
    CONVERSATION_GUEST_LINKS: 'conversationGuestLinks',
    FEATURE_CONFIGS: '/feature-configs',
    FEATURES: 'features',
    FILE_SHARING: 'fileSharing',
    LEGAL_HOLD: 'legalhold',
    SND_FACTOR_PASSWORD: 'sndFactorPasswordChallenge',
    SSO: 'sso',
    MLS: 'mls',
    MLSE2EID: 'mlsE2EId',
    MLS_MIGRATION: 'mlsMigration',
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
   * @deprecated Use `getAllFeatures()` instead. It is teamId agnostic.
   */
  public async getAllTeamFeatures(teamId: string): Promise<FeatureList> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}`,
    };

    const response = await this.client.sendJSON<FeatureList>(config);
    return response.data;
  }

  public async getLegalholdFeature(teamId: string): Promise<FeatureLegalhold> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.LEGAL_HOLD}`,
    };

    const response = await this.client.sendJSON<FeatureLegalhold>(config);
    return response.data;
  }

  public async getConversationGuestLinkFeature(teamId: string): Promise<FeatureConversationGuestLink> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.CONVERSATION_GUEST_LINKS}`,
    };

    const response = await this.client.sendJSON<FeatureConversationGuestLink>(config);
    return response.data;
  }

  public async putConversationGuestLinkFeature(
    teamId: string,
    conversationGuestLinkFeature: Omit<FeatureConversationGuestLink, 'lockStatus'>,
  ): Promise<FeatureConversationGuestLink> {
    const config: AxiosRequestConfig = {
      data: conversationGuestLinkFeature,
      method: 'put',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.CONVERSATION_GUEST_LINKS}`,
    };

    try {
      const response = await this.client.sendJSON<FeatureConversationGuestLink>(config);
      return response.data;
    } catch (error) {
      switch ((error as BackendError).label) {
        case BackendErrorLabel.FEATURE_LOCKED: {
          throw new FeatureLockedError((error as BackendError).message);
        }
      }
      throw error;
    }
  }

  public async getConferenceCallingFeature(teamId: string): Promise<FeatureConferenceCalling> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.CALLING_CONFERENCE}`,
    };

    const response = await this.client.sendJSON<FeatureConferenceCalling>(config);
    return response.data;
  }

  public async putConferenceCallingFeature(
    teamId: string,
    conferenceCallingFeature: Omit<FeatureConferenceCalling, 'lockStatus'>,
  ): Promise<FeatureConferenceCalling> {
    const config: AxiosRequestConfig = {
      data: conferenceCallingFeature,
      method: 'put',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.CALLING_CONFERENCE}`,
    };

    try {
      const response = await this.client.sendJSON<FeatureConferenceCalling>(config);
      return response.data;
    } catch (error) {
      switch ((error as BackendError).label) {
        case BackendErrorLabel.FEATURE_LOCKED: {
          throw new FeatureLockedError((error as BackendError).message);
        }
      }
      throw error;
    }
  }

  /**
   * Unimplemented endpoint, may exist in a future release
   */
  public async getVideoCallingFeature(teamId: string): Promise<FeatureVideoCalling> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.CALLING_VIDEO}`,
    };

    const response = await this.client.sendJSON<FeatureConferenceCalling>(config);
    return response.data;
  }

  /**
   * Unimplemented endpoint, may exist in a future release
   */
  public async putVideoCallingFeature(
    teamId: string,
    videoCallingFeature: Omit<FeatureVideoCalling, 'lockStatus'>,
  ): Promise<FeatureVideoCalling> {
    const config: AxiosRequestConfig = {
      data: videoCallingFeature,
      method: 'put',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.CALLING_VIDEO}`,
    };

    try {
      const response = await this.client.sendJSON<FeatureVideoCalling>(config);
      return response.data;
    } catch (error) {
      switch ((error as BackendError).label) {
        case BackendErrorLabel.FEATURE_LOCKED: {
          throw new FeatureLockedError((error as BackendError).message);
        }
      }
      throw error;
    }
  }

  public async getSelfDeletingMessagesFeature(teamId: string): Promise<FeatureSelfDeletingMessages> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.SELF_DELETING_MESSAGES}`,
    };

    const response = await this.client.sendJSON<FeatureSelfDeletingMessages>(config);
    return response.data;
  }

  public async putSelfDeletingMessagesFeature(
    teamId: string,
    selfDeleteingMessagesFeature: Omit<FeatureSelfDeletingMessages, 'lockStatus'>,
  ): Promise<FeatureSelfDeletingMessages> {
    const config: AxiosRequestConfig = {
      data: selfDeleteingMessagesFeature,
      method: 'put',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.SELF_DELETING_MESSAGES}`,
    };

    try {
      const response = await this.client.sendJSON<FeatureSelfDeletingMessages>(config);
      return response.data;
    } catch (error) {
      switch ((error as BackendError).label) {
        case BackendErrorLabel.FEATURE_LOCKED: {
          throw new FeatureLockedError((error as BackendError).message);
        }
      }
      throw error;
    }
  }

  public async getFileSharingFeature(teamId: string): Promise<FeatureFileSharing> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.FILE_SHARING}`,
    };

    const response = await this.client.sendJSON<FeatureFileSharing>(config);
    return response.data;
  }

  public async putFileSharingFeature(
    teamId: string,
    fileSharingFeature: Omit<FeatureFileSharing, 'lockStatus'>,
  ): Promise<FeatureFileSharing> {
    const config: AxiosRequestConfig = {
      data: fileSharingFeature,
      method: 'put',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.FILE_SHARING}`,
    };

    try {
      const response = await this.client.sendJSON<FeatureFileSharing>(config);
      return response.data;
    } catch (error) {
      switch ((error as BackendError).label) {
        case BackendErrorLabel.FEATURE_LOCKED: {
          throw new FeatureLockedError((error as BackendError).message);
        }
      }
      throw error;
    }
  }

  public async getSndFactorPasswordFeature(teamId: string): Promise<FeatureSndFactorPassword> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.SND_FACTOR_PASSWORD}`,
    };

    const response = await this.client.sendJSON<FeatureSndFactorPassword>(config);
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

  public async getMLSFeature(teamId: string): Promise<FeatureMLS> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.MLS}`,
    };

    const response = await this.client.sendJSON<FeatureMLS>(config);
    return response.data;
  }

  public async putMLSFeature(teamId: string, mlsFeature: Omit<FeatureMLS, 'lockStatus'>): Promise<FeatureMLS> {
    const config: AxiosRequestConfig = {
      data: mlsFeature,
      method: 'put',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.MLS}`,
    };

    const response = await this.client.sendJSON<FeatureMLS>(config);
    return response.data;
  }

  public async putMLSE2EIdFeature(
    teamId: string,
    mlsFeature: Omit<FeatureMLSE2EId, 'lockStatus'>,
  ): Promise<FeatureMLSE2EId> {
    const config: AxiosRequestConfig = {
      data: mlsFeature,
      method: 'put',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.MLSE2EID}`,
    };

    const response = await this.client.sendJSON<FeatureMLSE2EId>(config);
    return response.data;
  }

  public async putMLSMigrationFeature(
    teamId: string,
    mlsMigrationFeature: Omit<FeatureMLSMigration, 'lockStatus'>,
  ): Promise<FeatureMLSMigration> {
    const config: AxiosRequestConfig = {
      data: mlsMigrationFeature,
      method: 'put',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.MLS_MIGRATION}`,
    };

    const response = await this.client.sendJSON<FeatureMLSMigration>(config);
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

  // Get domainRegistration feature
  public async getDomainRegistrationFeature(teamId: string): Promise<FeatureDomainRegistration> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.DOMAIN_REGISTRATION}`,
    };

    const response = await this.client.sendJSON<FeatureDomainRegistration>(config);
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

  public async getAllowedGlobalOperationsFeature(teamId: string): Promise<FeatureAllowedGlobalOperations> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.ALLOWED_GLOBAL_OPERATIONS}`,
    };

    const response = await this.client.sendJSON<FeatureAllowedGlobalOperations>(config);
    return response.data;
  }

  public async getConsumableNotificationsFeature(teamId: string): Promise<FeatureConsumableNotifications> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.CONSUMABLE_NOTIFICATIONS}`,
    };

    const response = await this.client.sendJSON<FeatureConsumableNotifications>(config);
    return response.data;
  }

  public async putAppLockFeature(
    teamId: string,
    appLockFeature: Omit<FeatureAppLock, 'lockStatus'>,
  ): Promise<FeatureAppLock> {
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
        case BackendErrorLabel.FEATURE_LOCKED: {
          throw new FeatureLockedError((error as BackendError).message);
        }
      }
      throw error;
    }
  }
  public async putDownloadPathFeature(
    teamId: string,
    dlPathFeature: Omit<FeatureDownloadPath, 'lockStatus'>,
  ): Promise<FeatureDownloadPath> {
    const config: AxiosRequestConfig = {
      data: dlPathFeature,
      method: 'put',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.DL_PATH}`,
    };

    const response = await this.client.sendJSON<FeatureDownloadPath>(config);
    return response.data;
  }

  public async putChannelsFeature(teamId: string, channelFeature: Partial<FeatureChannels>): Promise<FeatureChannels> {
    const config: AxiosRequestConfig = {
      data: channelFeature,
      method: 'put',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.CHANNELS}`,
    };

    const response = await this.client.sendJSON<FeatureChannels>(config);
    return response.data;
  }

  public async getCellsFeature(teamId: string): Promise<FeatureCells> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${FeatureAPI.URL.TEAMS}/${teamId}/${FeatureAPI.URL.FEATURES}/${FeatureAPI.URL.CELLS}`,
    };

    const response = await this.client.sendJSON<FeatureCells>(config);
    return response.data;
  }
}
