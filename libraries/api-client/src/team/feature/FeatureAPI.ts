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
import logdown from 'logdown';

import {LogFactory} from '@wireapp/commons';

import {InvalidAppLockTimeoutError} from './FeatureError';
import {
  allFeaturesResponseSchema,
  FeatureAllowedGlobalOperations,
  FeatureAppLock,
  FeatureCells,
  FeatureChannels,
  FeatureAssetAuditLog,
  FeatureConferenceCalling,
  FeatureConsumableNotifications,
  FeatureDigitalSignature,
  FeatureDomainRegistration,
  FeatureDownloadPath,
  FeatureFileSharing,
  FeatureLegalhold,
  FeatureMLS,
  FeatureMLSE2EId,
  FeatureMLSMigration,
  FeatureSelfDeletingMessages,
  FeatureSndFactorPassword,
  FeatureSSO,
  FeatureVideoCalling,
} from './FeatureList.schema';
import {FeatureList} from './FeatureList.types';

import {BackendError, BackendErrorLabel, HttpClient} from '../../http';

import {FeatureConversationGuestLink, FeatureLockedError} from '.';

export const isBackendError = (error: unknown): error is BackendError => {
  return error instanceof Error && 'label' in error && typeof (error as any).label === 'string';
};

export class FeatureAPI {
  private readonly logger: logdown.Logger;

  constructor(private readonly client: HttpClient) {
    this.logger = LogFactory.getLogger('@wireapp/api-client/FeatureAPI');
  }

  /**
   * Retrieves all feature flags for the current user/team.
   *
   * This endpoint is backwards and forwards compatible across Wire backend API versions:
   * - Validates response structure using Zod but never throws validation errors
   * - Logs validation errors for debugging/monitoring purposes
   * - Returns original API response even if validation fails
   * - Works with older backends (missing features) and newer backends (unknown features)
   */
  public async getAllFeatures(): Promise<FeatureList> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: '/feature-configs',
    };

    const response = await this.client.sendJSON<FeatureList>(config);

    // Validate response schema without throwing errors (backwards/forwards compatibility)
    const validationResult = allFeaturesResponseSchema.safeParse(response.data);

    if (!validationResult.success) {
      const validationErrorDetails = validationResult.error.format();

      this.logger.error(
        'Feature flags response failed schema validation. ' +
          'This may indicate an API version mismatch between client and backend. ' +
          'The response will still be returned to maintain compatibility.',
        {
          validationErrors: validationErrorDetails,
          receivedResponse: response.data,
        },
      );
    }

    // Always return the original response data to ensure compatibility
    // across different backend API versions. This allows consumers to mutate
    // the response if needed (e.g., wire-webapp's TeamRepository).
    // Once all consumers are updated to not mutate the response, we can
    // return validationResult.data instead for immutability benefits.
    return response.data;
  }

  public async getLegalholdFeature(teamId: string): Promise<FeatureLegalhold> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/features/legalhold`,
    };

    const response = await this.client.sendJSON<FeatureLegalhold>(config);
    return response.data;
  }

  public async getConversationGuestLinkFeature(teamId: string): Promise<FeatureConversationGuestLink> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/features/conversation_guest_links`,
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
      url: `/teams/${teamId}/features/conversation_guest_links`,
    };

    try {
      const response = await this.client.sendJSON<FeatureConversationGuestLink>(config);
      return response.data;
    } catch (error) {
      if (isBackendError(error) && error.label === BackendErrorLabel.FEATURE_LOCKED) {
        throw new FeatureLockedError(error.message);
      }
      throw error;
    }
  }

  public async getConferenceCallingFeature(teamId: string): Promise<FeatureConferenceCalling> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/features/conferenceCalling`,
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
      url: `/teams/${teamId}/features/conferenceCalling`,
    };

    try {
      const response = await this.client.sendJSON<FeatureConferenceCalling>(config);
      return response.data;
    } catch (error) {
      if (isBackendError(error) && error.label === BackendErrorLabel.FEATURE_LOCKED) {
        throw new FeatureLockedError(error.message);
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
      url: `/teams/${teamId}/features/callingVideo`,
    };

    const response = await this.client.sendJSON<FeatureVideoCalling>(config);
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
      url: `/teams/${teamId}/features/callingVideo`,
    };

    try {
      const response = await this.client.sendJSON<FeatureVideoCalling>(config);
      return response.data;
    } catch (error) {
      if (isBackendError(error) && error.label === BackendErrorLabel.FEATURE_LOCKED) {
        throw new FeatureLockedError(error.message);
      }
      throw error;
    }
  }

  public async getSelfDeletingMessagesFeature(teamId: string): Promise<FeatureSelfDeletingMessages> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/features/selfDeletingMessages`,
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
      url: `/teams/${teamId}/features/selfDeletingMessages`,
    };

    try {
      const response = await this.client.sendJSON<FeatureSelfDeletingMessages>(config);
      return response.data;
    } catch (error) {
      if (isBackendError(error) && error.label === BackendErrorLabel.FEATURE_LOCKED) {
        throw new FeatureLockedError(error.message);
      }
      throw error;
    }
  }

  public async getFileSharingFeature(teamId: string): Promise<FeatureFileSharing> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/features/fileSharing`,
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
      url: `/teams/${teamId}/features/fileSharing`,
    };

    try {
      const response = await this.client.sendJSON<FeatureFileSharing>(config);
      return response.data;
    } catch (error) {
      if (isBackendError(error) && error.label === BackendErrorLabel.FEATURE_LOCKED) {
        throw new FeatureLockedError(error.message);
      }
      throw error;
    }
  }

  public async getSndFactorPasswordFeature(teamId: string): Promise<FeatureSndFactorPassword> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/features/sndFactorPasswordChallenge`,
    };

    const response = await this.client.sendJSON<FeatureSndFactorPassword>(config);
    return response.data;
  }

  public async getSSOFeature(teamId: string): Promise<FeatureSSO> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/features/sso`,
    };

    const response = await this.client.sendJSON<FeatureSSO>(config);
    return response.data;
  }

  public async getMLSFeature(teamId: string): Promise<FeatureMLS> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/features/mls`,
    };

    const response = await this.client.sendJSON<FeatureMLS>(config);
    return response.data;
  }

  public async putMLSFeature(teamId: string, mlsFeature: Omit<FeatureMLS, 'lockStatus'>): Promise<FeatureMLS> {
    const config: AxiosRequestConfig = {
      data: mlsFeature,
      method: 'put',
      url: `/teams/${teamId}/features/mls`,
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
      url: `/teams/${teamId}/features/mlsE2EId`,
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
      url: `/teams/${teamId}/features/mlsMigration`,
    };

    const response = await this.client.sendJSON<FeatureMLSMigration>(config);
    return response.data;
  }

  public async getDigitalSignatureFeature(teamId: string): Promise<FeatureDigitalSignature> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/features/digitalSignatures`,
    };

    const response = await this.client.sendJSON<FeatureDigitalSignature>(config);
    return response.data;
  }

  // Get domainRegistration feature
  public async getDomainRegistrationFeature(teamId: string): Promise<FeatureDomainRegistration> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/features/domainRegistration`,
    };

    const response = await this.client.sendJSON<FeatureDomainRegistration>(config);
    return response.data;
  }

  public async getAppLockFeature(teamId: string): Promise<FeatureAppLock> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/features/appLock`,
    };

    const response = await this.client.sendJSON<FeatureAppLock>(config);
    return response.data;
  }

  public async getAllowedGlobalOperationsFeature(teamId: string): Promise<FeatureAllowedGlobalOperations> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/features/allowedGlobalOperations`,
    };

    const response = await this.client.sendJSON<FeatureAllowedGlobalOperations>(config);
    return response.data;
  }

  public async getConsumableNotificationsFeature(teamId: string): Promise<FeatureConsumableNotifications> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/features/consumableNotifications`,
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
      url: `/teams/${teamId}/features/appLock`,
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
      url: `/teams/${teamId}/features/enforceFileDownloadLocation`,
    };

    const response = await this.client.sendJSON<FeatureDownloadPath>(config);
    return response.data;
  }

  public async putChannelsFeature(teamId: string, channelFeature: Partial<FeatureChannels>): Promise<FeatureChannels> {
    const config: AxiosRequestConfig = {
      data: channelFeature,
      method: 'put',
      url: `/teams/${teamId}/features/channels`,
    };

    const response = await this.client.sendJSON<FeatureChannels>(config);
    return response.data;
  }

  public async getCellsFeature(teamId: string): Promise<FeatureCells> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/features/cells`,
    };

    const response = await this.client.sendJSON<FeatureCells>(config);
    return response.data;
  }

  public async getAssetAuditLog(teamId: string): Promise<FeatureAssetAuditLog> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/features/assetAuditLog`,
    };

    const response = await this.client.sendJSON<FeatureAssetAuditLog>(config);
    return response.data;
  }
}
