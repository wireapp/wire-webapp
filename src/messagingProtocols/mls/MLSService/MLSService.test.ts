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

import {ClientType, RegisteredClient} from '@wireapp/api-client/lib/client';

import {randomUUID} from 'crypto';

import {APIClient} from '@wireapp/api-client';
import {CoreCrypto} from '@wireapp/core-crypto';

import {MLSService} from './MLSService';

jest.createMockFromModule('@wireapp/api-client');

function createUserId() {
  return {id: randomUUID(), domain: ''};
}

describe('MLSService', () => {
  const apiClient = new APIClient();
  const mockCoreCrypto = {
    createConversation: jest.fn(),
    conversationExists: jest.fn(),
    wipeConversation: jest.fn(),
    clientValidKeypackagesCount: jest.fn(),
    clientKeypackages: jest.fn(),
    mlsInit: jest.fn(),
    clientPublicKey: jest.fn(),
  } as unknown as CoreCrypto;

  describe('registerConversation', () => {
    let mlsService: MLSService;

    beforeEach(() => {
      mlsService = new MLSService(apiClient, mockCoreCrypto, {});
      jest
        .spyOn(apiClient.api.client, 'getPublicKeys')
        .mockResolvedValue({removal: {algo: 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc='}});

      jest.spyOn(apiClient.api.client, 'claimMLSKeyPackages').mockResolvedValue({key_packages: []});
      jest.spyOn(mlsService, 'scheduleKeyMaterialRenewal').mockImplementation();
      jest.spyOn(mlsService as any, 'processCommitAction').mockImplementation(() => ({
        failed_to_send: [],
        failed: [],
        events: [],
        time: '',
      }));
      jest.spyOn(mlsService as any, 'cancelKeyMaterialRenewal').mockImplementation();
    });

    it('creates a new mls conversation and avoid adding the selfUser', async () => {
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc=';
      const selfUser = createUserId();
      const creator = {user: selfUser, client: 'client-1'};
      const users = [createUserId(), createUserId()];

      await mlsService.registerConversation(groupId, [...users, selfUser], creator);

      expect(apiClient.api.client.claimMLSKeyPackages).toHaveBeenCalledTimes(3);
      expect(apiClient.api.client.claimMLSKeyPackages).toHaveBeenCalledWith(
        selfUser.id,
        selfUser.domain,
        '0x1',
        creator.client,
      );
      expect(mlsService.scheduleKeyMaterialRenewal).toHaveBeenCalledWith(groupId);
    });

    it('creates a new mls conversation without any creator', async () => {
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFc=';

      await mlsService.registerConversation(groupId, [createUserId(), createUserId()]);

      expect(mlsService.scheduleKeyMaterialRenewal).toHaveBeenCalledWith(groupId);
    });

    it('cancels key material timers after group is wiped', async () => {
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFc=';
      jest.spyOn(mockCoreCrypto, 'conversationExists').mockResolvedValueOnce(true);
      await mlsService.wipeConversation(groupId);
      expect(mlsService.cancelKeyMaterialRenewal).toHaveBeenCalledWith(groupId);
    });
  });

  describe('isConversationEstablished', () => {
    it('returns false if conversation does not exist locally', async () => {
      const mlsService = new MLSService(apiClient, mockCoreCrypto, {});

      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc=';

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(false);

      const isEstablshed = await mlsService.isConversationEstablished(groupId);

      expect(isEstablshed).toBe(false);
    });

    it('returns false if epoch number is 0', async () => {
      const mlsService = new MLSService(apiClient, mockCoreCrypto, {});

      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc=';

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(true);
      jest.spyOn(mlsService, 'getEpoch').mockResolvedValueOnce(0);

      const isEstablshed = await mlsService.isConversationEstablished(groupId);

      expect(isEstablshed).toBe(false);
    });

    it.each([1, 2, 100])('returns false if epoch number is 1 or more', async epoch => {
      const mlsService = new MLSService(apiClient, mockCoreCrypto, {});

      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc=';

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(true);
      jest.spyOn(mlsService, 'getEpoch').mockResolvedValueOnce(epoch);

      const isEstablshed = await mlsService.isConversationEstablished(groupId);

      expect(isEstablshed).toBe(true);
    });
  });

  describe('initClient', () => {
    it('uploads public key only if it was not yet defined on client entity', async () => {
      const mlsService = new MLSService(apiClient, mockCoreCrypto, {});

      const mockUserId = {id: 'user-1', domain: 'local.zinfra.io'};
      const mockClientId = 'client-1';
      const mockClient = {mls_public_keys: {}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      const mockedClientPublicKey = new Uint8Array();

      jest.spyOn(mockCoreCrypto, 'clientPublicKey').mockResolvedValueOnce(mockedClientPublicKey);
      jest.spyOn(apiClient.api.client, 'putClient').mockResolvedValueOnce(undefined);
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(mlsService.config.nbKeyPackages);

      await mlsService.initClient(mockUserId, mockClient);

      expect(mockCoreCrypto.mlsInit).toHaveBeenCalled();
      expect(apiClient.api.client.putClient).toHaveBeenCalledWith(mockClientId, expect.anything());
    });

    it('uploads key packages if there are not enough keys on backend', async () => {
      const mlsService = new MLSService(apiClient, mockCoreCrypto, {});

      const mockUserId = {id: 'user-1', domain: 'local.zinfra.io'};
      const mockClientId = 'client-1';
      const mockClient = {mls_public_keys: {ed25519: 'key'}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      const mockedClientKeyPackages = [new Uint8Array()];
      jest.spyOn(mockCoreCrypto, 'clientKeypackages').mockResolvedValueOnce(mockedClientKeyPackages);
      jest
        .spyOn(apiClient.api.client, 'getMLSKeyPackageCount')
        .mockResolvedValueOnce(mlsService.config.minRequiredNumberOfAvailableKeyPackages - 1);
      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockResolvedValueOnce(undefined);

      await mlsService.initClient(mockUserId, mockClient);

      expect(mockCoreCrypto.mlsInit).toHaveBeenCalled();
      expect(apiClient.api.client.uploadMLSKeyPackages).toHaveBeenCalledWith(mockClientId, expect.anything());
    });

    it('does not upload public key or key packages if both are already uploaded', async () => {
      const mlsService = new MLSService(apiClient, mockCoreCrypto, {});

      const mockUserId = {id: 'user-1', domain: 'local.zinfra.io'};
      const mockClientId = 'client-1';
      const mockClient = {mls_public_keys: {ed25519: 'key'}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      jest.spyOn(apiClient.api.client, 'getClient').mockResolvedValueOnce(mockClient);

      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(mlsService.config.nbKeyPackages);

      await mlsService.initClient(mockUserId, mockClient);

      expect(mockCoreCrypto.mlsInit).toHaveBeenCalled();
      expect(apiClient.api.client.uploadMLSKeyPackages).not.toHaveBeenCalled();
      expect(apiClient.api.client.putClient).not.toHaveBeenCalled();
    });
  });
});
