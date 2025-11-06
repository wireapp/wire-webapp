/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {SUBCONVERSATION_ID, Subconversation} from '@wireapp/api-client/lib/conversation';
import {BackendError, BackendErrorLabel, StatusCode} from '@wireapp/api-client/lib/http';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {APIClient} from '@wireapp/api-client';

import {SubconversationService} from './SubconversationService';

import {MLSService, MLSServiceEvents} from '../../messagingProtocols/mls';
import {openDB} from '../../storage/CoreDB';
import {constructFullyQualifiedClientId} from '../../util/fullyQualifiedClientIdUtils';

interface SubconversationMember {
  client_id: string;
  domain: string;
  user_id: string;
}

const getSubconversationResponse = ({
  epoch,
  epochTimestamp,
  parentConversationId,
  groupId,
  members = [],
  subconversationId = SUBCONVERSATION_ID.CONFERENCE,
}: {
  epoch: number;
  epochTimestamp: string;
  parentConversationId: QualifiedId;
  groupId: string;
  members?: SubconversationMember[];
  subconversationId?: SUBCONVERSATION_ID;
}): Subconversation => {
  return {
    cipher_suite: 1,
    epoch,
    parent_qualified_id: parentConversationId,
    group_id: groupId,
    members,
    subconv_id: subconversationId,
    epoch_timestamp: epochTimestamp,
  };
};

const apiClients: APIClient[] = [];

const buildSubconversationService = async (isFederated = false) => {
  const apiClient = new APIClient({urls: APIClient.BACKEND.STAGING});
  apiClients.push(apiClient);
  apiClient.backendFeatures.isFederated = isFederated;

  const mlsService = {
    conversationExists: jest.fn(),
    wipeConversation: jest.fn(),
    registerConversation: jest.fn(),
    getEpoch: jest.fn(),
    joinByExternalCommit: jest.fn(),
    getGroupIdFromConversationId: jest.fn(),
    exportSecretKey: jest.fn(),
    getClientIds: jest.fn(),
    renewKeyMaterial: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    removeClientsFromConversation: jest.fn(),
  } as unknown as MLSService;

  const coreDatabase = await openDB('core-test-db');

  const subconversationService = new SubconversationService(apiClient, coreDatabase, mlsService);

  return [subconversationService, {apiClient, mlsService, coreDatabase}] as const;
};

describe('SubconversationService', () => {
  afterAll(() => {
    apiClients.forEach(client => client.disconnect());
  });

  describe('joinConferenceSubconversation', () => {
    afterEach(() => {
      jest.useRealTimers();
      jest.clearAllMocks();
    });

    it('wipes group locally (if it exists) before registering a group if remote epoch is equal 0', async () => {
      const [subconversationService, {apiClient, mlsService}] = await buildSubconversationService();

      const parentConversationId = {id: 'parentConversationId', domain: 'domain'};
      const parentGroupId = 'parentGroupId';
      const subconversationGroupId = 'subconversationGroupId';

      const subconversationResponse = getSubconversationResponse({
        epoch: 0,
        epochTimestamp: '',
        parentConversationId,
        groupId: subconversationGroupId,
        subconversationId: SUBCONVERSATION_ID.CONFERENCE,
      });

      jest.spyOn(apiClient.api.conversation, 'getSubconversation').mockResolvedValueOnce(subconversationResponse);
      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(true);

      await subconversationService.joinConferenceSubconversation(parentConversationId, parentGroupId);

      expect(mlsService.wipeConversation).toHaveBeenCalledWith(subconversationGroupId);
      expect(mlsService.registerConversation).toHaveBeenCalledWith(subconversationGroupId, [], {parentGroupId});
    });

    it('registers a group if remote epoch is 0 and group does not exist locally', async () => {
      const [subconversationService, {apiClient, mlsService}] = await buildSubconversationService();

      const parentConversationId = {id: 'parentConversationId', domain: 'domain'};
      const parentGroupId = 'parentGroupId';
      const subconversationGroupId = 'subconversationGroupId';

      const subconversationResponse = getSubconversationResponse({
        epoch: 0,
        epochTimestamp: '',
        parentConversationId,
        groupId: subconversationGroupId,
        subconversationId: SUBCONVERSATION_ID.CONFERENCE,
      });

      jest.spyOn(apiClient.api.conversation, 'getSubconversation').mockResolvedValueOnce(subconversationResponse);
      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(false);

      await subconversationService.joinConferenceSubconversation(parentConversationId, parentGroupId);

      expect(mlsService.wipeConversation).not.toHaveBeenCalled();
      expect(mlsService.registerConversation).toHaveBeenCalledWith(subconversationGroupId, [], {parentGroupId});
    });

    it('deletes conference subconversation from backend if group is already established and epoch is older than one day, then rejoins', async () => {
      jest.useFakeTimers();
      const [subconversationService, {apiClient, mlsService}] = await buildSubconversationService();

      const parentConversationId = {id: 'parentConversationId', domain: 'domain'};
      const parentGroupId = 'parentGroupId';
      const subconversationGroupId = 'subconversationGroupId';
      const initialSubconversationEpoch = 1;

      const currentTimeISO = '2023-10-24T12:00:00.000Z';
      jest.setSystemTime(new Date(currentTimeISO));

      jest.spyOn(apiClient.api.conversation, 'deleteSubconversation').mockResolvedValueOnce();

      // epoch time is older than 24h
      const epochTimestamp = '2023-10-23T11:00:00.000Z';

      const subconversationResponse = getSubconversationResponse({
        epoch: initialSubconversationEpoch,
        epochTimestamp: epochTimestamp,
        parentConversationId,
        groupId: subconversationGroupId,
        subconversationId: SUBCONVERSATION_ID.CONFERENCE,
      });

      jest.spyOn(apiClient.api.conversation, 'getSubconversation').mockResolvedValueOnce(subconversationResponse);

      // After deletion, epoch is 0
      const subconversationEpochAfterDeletion = 0;
      const subconversationResponse2 = getSubconversationResponse({
        epoch: subconversationEpochAfterDeletion,
        epochTimestamp: epochTimestamp,
        parentConversationId,
        groupId: subconversationGroupId,
        subconversationId: SUBCONVERSATION_ID.CONFERENCE,
      });

      jest.spyOn(apiClient.api.conversation, 'getSubconversation').mockResolvedValueOnce(subconversationResponse2);

      await subconversationService.joinConferenceSubconversation(parentConversationId, parentGroupId);

      expect(apiClient.api.conversation.deleteSubconversation).toHaveBeenCalledWith(
        parentConversationId,
        SUBCONVERSATION_ID.CONFERENCE,
        {
          groupId: subconversationGroupId,
          epoch: initialSubconversationEpoch,
        },
      );

      expect(mlsService.registerConversation).toHaveBeenCalledTimes(1);
      expect(mlsService.wipeConversation).toHaveBeenCalledWith(subconversationGroupId);
    });

    it('joins conference subconversation with external commit if group is already established and epoch is younger than one day', async () => {
      jest.useFakeTimers();
      const [subconversationService, {apiClient, mlsService}] = await buildSubconversationService();

      const parentConversationId = {id: 'parentConversationId', domain: 'domain'};
      const subconversationGroupId = 'subconversationGroupId';
      const parentGroupId = 'parentGroupId';
      const subconversationEpoch = 1;

      const currentTimeISO = '2023-10-24T12:00:00.000Z';
      jest.setSystemTime(new Date(currentTimeISO));

      jest.spyOn(apiClient.api.conversation, 'deleteSubconversation').mockResolvedValueOnce();

      // epoch time is younger than 24h
      const epochTimestamp = '2023-10-23T13:00:00.000Z';

      const subconversationResponse = getSubconversationResponse({
        epoch: subconversationEpoch,
        epochTimestamp: epochTimestamp,
        parentConversationId,
        groupId: subconversationGroupId,
        subconversationId: SUBCONVERSATION_ID.CONFERENCE,
      });

      jest.spyOn(apiClient.api.conversation, 'getSubconversation').mockResolvedValueOnce(subconversationResponse);

      await subconversationService.joinConferenceSubconversation(parentConversationId, parentGroupId);

      expect(apiClient.api.conversation.deleteSubconversation).not.toHaveBeenCalled();
      expect(mlsService.registerConversation).not.toHaveBeenCalled();
      expect(mlsService.wipeConversation).not.toHaveBeenCalled();
      expect(mlsService.joinByExternalCommit).toHaveBeenCalled();
    });

    it('retries to join if registering a conversations throws an error', async () => {
      const [subconversationService, {apiClient, mlsService}] = await buildSubconversationService();

      const parentConversationId = {id: 'parentConversationId', domain: 'domain'};
      const parentGroupId = 'parentGroupId';
      const subconversationGroupId = 'subconversationGroupId';

      const subconversationResponse = getSubconversationResponse({
        epoch: 0,
        epochTimestamp: '',
        parentConversationId,
        groupId: subconversationGroupId,
        subconversationId: SUBCONVERSATION_ID.CONFERENCE,
      });

      jest.spyOn(apiClient.api.conversation, 'getSubconversation').mockResolvedValue(subconversationResponse);
      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(false);

      jest
        .spyOn(mlsService, 'registerConversation')
        .mockRejectedValueOnce(new BackendError('', BackendErrorLabel.MLS_STALE_MESSAGE, StatusCode.CONFLICT));

      await subconversationService.joinConferenceSubconversation(parentConversationId, parentGroupId);

      expect(mlsService.wipeConversation).not.toHaveBeenCalled();
      expect(mlsService.registerConversation).toHaveBeenCalledWith(subconversationGroupId, [], {parentGroupId});
      expect(mlsService.registerConversation).toHaveBeenCalledTimes(2);
    });

    it('returns fresh epoch number after joining the group', async () => {
      const [subconversationService, {apiClient, mlsService}] = await buildSubconversationService();

      const parentConversationId = {id: 'parentConversationId', domain: 'domain'};
      const parentGroupId = 'parentGroupId';
      const subconversationGroupId = 'subconversationGroupId';

      const subconversationResponse = getSubconversationResponse({
        epoch: 0,
        epochTimestamp: '',
        parentConversationId,
        groupId: subconversationGroupId,
        subconversationId: SUBCONVERSATION_ID.CONFERENCE,
      });

      jest.spyOn(apiClient.api.conversation, 'getSubconversation').mockResolvedValueOnce(subconversationResponse);
      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(false);

      const updatedEpoch = 1;
      jest.spyOn(mlsService, 'getEpoch').mockResolvedValueOnce(updatedEpoch);

      const response = await subconversationService.joinConferenceSubconversation(parentConversationId, parentGroupId);

      expect(mlsService.wipeConversation).not.toHaveBeenCalled();
      expect(mlsService.registerConversation).toHaveBeenCalledWith(subconversationGroupId, [], {parentGroupId});
      expect(response).toEqual({epoch: updatedEpoch, groupId: subconversationGroupId});
    });
  });

  describe('leaveConferenceSubconversation', () => {
    it('does nothing if subconversation id is not found in the store', async () => {
      const [subconversationService, {mlsService}] = await buildSubconversationService();

      const parentConversationId = {id: 'parentConversationId', domain: 'domain'};

      await subconversationService.leaveConferenceSubconversation(parentConversationId);

      expect(mlsService.wipeConversation).not.toHaveBeenCalled();
    });

    it('removes subconversation id from the store if conversations was known but not established locally', async () => {
      const [subconversationService, {mlsService}] = await buildSubconversationService();

      const parentConversationId = {id: 'parentConversationId', domain: 'domain'};
      const subconversationGroupId = 'subconversationGroupId';

      await subconversationService.saveSubconversationGroupId(
        parentConversationId,
        SUBCONVERSATION_ID.CONFERENCE,
        subconversationGroupId,
      );

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(false);

      await subconversationService.leaveConferenceSubconversation(parentConversationId);
      const groupId = await subconversationService.getSubconversationGroupId(
        parentConversationId,
        SUBCONVERSATION_ID.CONFERENCE,
      );

      expect(groupId).toEqual(undefined);
      expect(mlsService.wipeConversation).not.toHaveBeenCalled();
    });

    it('deletes self client from conference subconversation', async () => {
      const [subconversationService, {apiClient, mlsService}] = await buildSubconversationService();

      const parentConversationId = {id: 'parentConversationId', domain: 'domain'};
      const subconversationGroupId = 'subconversationGroupId';

      await subconversationService.saveSubconversationGroupId(
        parentConversationId,
        SUBCONVERSATION_ID.CONFERENCE,
        subconversationGroupId,
      );

      jest.spyOn(apiClient.api.conversation, 'deleteSubconversationSelf');
      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(true);

      await subconversationService.leaveConferenceSubconversation(parentConversationId);
      const groupId = await subconversationService.getSubconversationGroupId(
        parentConversationId,
        SUBCONVERSATION_ID.CONFERENCE,
      );

      expect(groupId).toEqual(undefined);
      expect(apiClient.api.conversation.deleteSubconversationSelf).toHaveBeenCalledWith(
        parentConversationId,
        SUBCONVERSATION_ID.CONFERENCE,
      );
      expect(mlsService.wipeConversation).toHaveBeenCalledWith(subconversationGroupId);
    });
  });

  describe('getSubconversationEpochInfo', () => {
    it('returns null if subconversation id is not known by a client', async () => {
      const [subconversationService] = await buildSubconversationService();

      const parentConversationId = {id: 'parentConversationId', domain: 'domain'};
      const parentConversationGroupId = 'parentConversationGroupId';

      const response = await subconversationService.getSubconversationEpochInfo(
        parentConversationId,
        parentConversationGroupId,
      );

      expect(response).toEqual(null);
    });

    it('returns null if MLS group for subconversation does not exist locally', async () => {
      const [subconversationService, {mlsService}] = await buildSubconversationService();

      const parentConversationId = {id: 'parentConversationId', domain: 'domain'};
      const parentConversationGroupId = 'parentConversationGroupId';

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(false);

      const response = await subconversationService.getSubconversationEpochInfo(
        parentConversationId,
        parentConversationGroupId,
      );

      expect(response).toEqual(null);
    });

    it.each([true, false])('returns epoch info and advances epoch number', async (isFederated: boolean) => {
      const [subconversationService, {mlsService}] = await buildSubconversationService(isFederated);

      const parentConversationId = {id: 'parentConversationId', domain: 'domain'};
      const parentConversationGroupId = 'parentConversationGroupId';
      const subconversationGroupId = 'subconversationGroupId';

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(true);

      const mockedEpoch = 2;
      jest.spyOn(mlsService, 'getEpoch').mockResolvedValueOnce(mockedEpoch);

      const mockedSecretKey = 'mockedSecretKey';
      jest.spyOn(mlsService, 'exportSecretKey').mockResolvedValueOnce(mockedSecretKey);

      await subconversationService.saveSubconversationGroupId(
        parentConversationId,
        SUBCONVERSATION_ID.CONFERENCE,
        subconversationGroupId,
      );

      const subconversationMemberIds: {
        userId: string;
        clientId: string;
        domain: string;
      }[] = [{userId: 'userId1', clientId: 'clientId1', domain: 'domain'}];

      const parentConversationMemberIds: {
        userId: string;
        clientId: string;
        domain: string;
      }[] = [
        {userId: 'userId1', clientId: 'clientId1', domain: 'domain'},
        {userId: 'userId2', clientId: 'clientId2', domain: 'domain'},
      ];

      jest.spyOn(mlsService, 'getClientIds').mockImplementation(async groupId => {
        if (groupId === parentConversationGroupId) {
          return parentConversationMemberIds;
        }

        return subconversationMemberIds;
      });

      const response = await subconversationService.getSubconversationEpochInfo(
        parentConversationId,
        parentConversationGroupId,
        true,
      );

      const expected = {
        epoch: mockedEpoch,
        keyLength: 32,
        members: [
          {clientid: 'clientId1', in_subconv: true, userid: isFederated ? 'userId1@domain' : 'userId1'},
          {clientid: 'clientId2', in_subconv: false, userid: isFederated ? 'userId2@domain' : 'userId2'},
        ],
        secretKey: mockedSecretKey,
      };

      expect(response).toEqual(expected);
      expect(mlsService.renewKeyMaterial).toHaveBeenCalledWith(subconversationGroupId);
    });
  });

  describe('subscribeToEpochUpdates', () => {
    it('should subscribe to newEpoch event', async () => {
      const [subconversationService, {mlsService}] = await buildSubconversationService();

      const parentConversationId = {id: 'parentConversationId', domain: 'domain'};
      const parentConversationGroupId = 'parentConversationGroupId';

      const subconversationGroupId = 'subconversationGroupId';
      const mockedInitialEpoch = 1;

      await subconversationService.saveSubconversationGroupId(
        parentConversationId,
        SUBCONVERSATION_ID.CONFERENCE,
        subconversationGroupId,
      );

      const mockedEpochInfo = {epoch: mockedInitialEpoch, keyLength: 32, members: [], secretKey: ''};
      jest.spyOn(subconversationService, 'getSubconversationEpochInfo').mockResolvedValueOnce(mockedEpochInfo);
      jest
        .spyOn(subconversationService, 'joinConferenceSubconversation')
        .mockResolvedValue({epoch: mockedInitialEpoch, groupId: subconversationGroupId});
      jest.spyOn(mlsService, 'getEpoch').mockResolvedValue(mockedInitialEpoch);

      const findConversationByGroupId = (groupId: string) => {
        if (groupId === parentConversationGroupId) {
          return parentConversationId;
        }

        return undefined;
      };

      const onEpochUpdateCallback = jest.fn();

      const unsubscribe = await subconversationService.subscribeToEpochUpdates(
        parentConversationId,
        parentConversationGroupId,
        findConversationByGroupId,
        onEpochUpdateCallback,
      );

      expect(mlsService.getEpoch).toHaveBeenCalledWith(subconversationGroupId);
      expect(mlsService.on).toHaveBeenCalledWith(MLSServiceEvents.NEW_EPOCH, expect.any(Function));
      expect(subconversationService.getSubconversationEpochInfo).toHaveBeenCalledWith(
        parentConversationId,
        parentConversationGroupId,
      );
      expect(onEpochUpdateCallback).toHaveBeenCalledWith(mockedEpochInfo);

      unsubscribe();
      expect(mlsService.off).toHaveBeenCalledWith(MLSServiceEvents.NEW_EPOCH, expect.any(Function));
    });
  });

  describe('removeClientFromConferenceSubconversation', () => {
    it('does nothing if subconversation group is not known', async () => {
      const [subconversationService, {mlsService}] = await buildSubconversationService();

      const parentConversationId = {id: 'parentConversationId', domain: 'domain'};

      const user = {id: 'userId', domain: 'domain'};
      const clientId = 'clientId';
      const clientToRemove = {user, clientId};

      await subconversationService.removeClientFromConferenceSubconversation(parentConversationId, clientToRemove);

      expect(mlsService.removeClientsFromConversation).not.toHaveBeenCalled();
    });

    it('does nothing if subconversation group is not established', async () => {
      const [subconversationService, {mlsService}] = await buildSubconversationService();

      const parentConversationId = {id: 'parentConversationId', domain: 'domain'};
      const subconversationGroupId = 'subconversationGroupId';

      await subconversationService.saveSubconversationGroupId(
        parentConversationId,
        SUBCONVERSATION_ID.CONFERENCE,
        subconversationGroupId,
      );

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValue(false);

      const user = {id: 'userId', domain: 'domain'};
      const clientId = 'clientId';
      const clientToRemove = {user, clientId};

      await subconversationService.removeClientFromConferenceSubconversation(parentConversationId, clientToRemove);

      expect(mlsService.removeClientsFromConversation).not.toHaveBeenCalled();
    });

    it('does nothing if client is not a subconversation group member', async () => {
      const [subconversationService, {mlsService}] = await buildSubconversationService();

      const parentConversationId = {id: 'parentConversationId', domain: 'domain'};
      const subconversationGroupId = 'subconversationGroupId';

      await subconversationService.saveSubconversationGroupId(
        parentConversationId,
        SUBCONVERSATION_ID.CONFERENCE,
        subconversationGroupId,
      );

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValue(true);

      const subconversationMemberIds: {
        userId: string;
        clientId: string;
        domain: string;
      }[] = [
        {userId: 'userId1', clientId: 'clientId1', domain: 'domain'},
        {userId: 'userId2', clientId: 'clientId2', domain: 'domain2'},
      ];

      jest.spyOn(mlsService, 'getClientIds').mockResolvedValueOnce(subconversationMemberIds);

      const user = {id: 'userId3', domain: 'domain3'};
      const clientId = 'clientId3';
      const clientToRemove = {user, clientId};

      await subconversationService.removeClientFromConferenceSubconversation(parentConversationId, clientToRemove);

      expect(mlsService.removeClientsFromConversation).not.toHaveBeenCalled();
    });

    it('removes client from subconversation group', async () => {
      const [subconversationService, {mlsService}] = await buildSubconversationService();

      const parentConversationId = {id: 'parentConversationId', domain: 'domain'};
      const subconversationGroupId = 'subconversationGroupId';

      await subconversationService.saveSubconversationGroupId(
        parentConversationId,
        SUBCONVERSATION_ID.CONFERENCE,
        subconversationGroupId,
      );

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValue(true);

      const user = {id: 'userId3', domain: 'domain3'};
      const clientId = 'clientId3';
      const clientToRemove = {user, clientId};

      const subconversationMemberIds: {
        userId: string;
        clientId: string;
        domain: string;
      }[] = [
        {userId: 'userId1', clientId: 'clientId1', domain: 'domain'},
        {userId: 'userId2', clientId: 'clientId2', domain: 'domain2'},
        {userId: clientToRemove.user.id, clientId: clientToRemove.clientId, domain: clientToRemove.user.domain},
      ];

      jest.spyOn(mlsService, 'getClientIds').mockResolvedValueOnce(subconversationMemberIds);

      await subconversationService.removeClientFromConferenceSubconversation(parentConversationId, clientToRemove);

      expect(mlsService.removeClientsFromConversation).toHaveBeenCalledWith(subconversationGroupId, [
        constructFullyQualifiedClientId(clientToRemove.user.id, clientToRemove.clientId, clientToRemove.user.domain),
      ]);
    });
  });
});
