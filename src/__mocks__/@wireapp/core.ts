/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {TaskScheduler} from '@wireapp/core/lib/util';

import {EventEmitter} from 'stream';

export class Account extends EventEmitter {
  backendFeatures = {
    federationEndpoints: true,
  };

  recurringTaskScheduler = {
    registerTask: jest.fn(),
    cancelTask: jest.fn(),
  };

  configureMLSCallbacks = jest.fn();
  enrollE2EI = jest.fn();
  service = {
    e2eIdentity: {
      isEnrollmentInProgress: jest.fn(),
      clearAllProgress: jest.fn(),
      hasActiveCertificate: jest.fn(),
      getCertificateData: jest.fn(),
      getUsersIdentities: jest.fn(() => new Map()),
      getDeviceIdentities: jest.fn(),
      getConversationState: jest.fn(),
    },
    mls: {
      schedulePeriodicKeyMaterialRenewals: jest.fn(),
      registerConversation: jest.fn(),
      getGroupIdFromConversationId: jest.fn(),
      renewKeyMaterial: jest.fn(),
      getClientIds: jest.fn(),
      getEpoch: jest.fn(),
      conversationExists: jest.fn(),
      exportSecretKey: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
      off: jest.fn(),
      scheduleKeyMaterialRenewal: jest.fn(),
    },
    asset: {
      uploadAsset: jest.fn(),
    },
    conversation: {
      send: jest.fn(),
      mlsGroupExistsLocally: jest.fn(),
      joinByExternalCommit: jest.fn(),
      addUsersToMLSConversation: jest.fn(),
      isMLSGroupEstablishedLocally: jest.fn(),
      establishMLS1to1Conversation: jest.fn(),
      messageTimer: {
        setConversationLevelTimer: jest.fn(),
      },
      removeUsersFromMLSConversation: jest.fn(),
      removeUserFromConversation: jest.fn(),
      blacklistConversation: jest.fn(),
      removeConversationFromBlacklist: jest.fn(),
    },
    subconversation: {
      joinConferenceSubconversation: jest.fn(),
      leaveConferenceSubconversation: jest.fn(),
      subscribeToEpochUpdates: jest.fn(),
    },
    client: {
      deleteClient: jest.fn(),
    },
  };
}

export const util = {
  TaskScheduler,
};
