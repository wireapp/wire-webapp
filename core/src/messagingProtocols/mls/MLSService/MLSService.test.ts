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

import {CoreCrypto} from '@wireapp/core-crypto/platforms/web/corecrypto';

import {randomUUID} from 'crypto';

import {APIClient} from '@wireapp/api-client';

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
      jest.spyOn(mlsService as any, 'processCommitAction').mockImplementation();
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
});
