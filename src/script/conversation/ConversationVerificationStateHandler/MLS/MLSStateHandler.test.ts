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

import {ConversationProtocol} from '@wireapp/api-client/lib/conversation/NewConversation';

import {Conversation} from 'src/script/entity/Conversation';
import {Core} from 'src/script/service/CoreSingleton';
import {createUuid} from 'Util/uuid';

import {
  MLSConversationVerificationStateHandler,
  registerMLSConversationVerificationStateHandler,
} from './MLSStateHandler';

import {ConversationState} from '../../ConversationState';

describe('MLSConversationVerificationStateHandler', () => {
  const uuid = createUuid();
  let handler: MLSConversationVerificationStateHandler;
  let mockOnConversationVerificationStateChange: jest.Mock;
  let mockConversationState: jest.Mocked<ConversationState>;
  let mockCore: jest.Mocked<Core>;
  const conversation: Conversation = new Conversation(uuid, '', ConversationProtocol.MLS);
  const groupId = 'groupIdXYZ';

  beforeEach(() => {
    conversation.groupId = groupId;

    mockOnConversationVerificationStateChange = jest.fn();
    mockConversationState = {
      filteredConversations: () => [conversation],
    } as unknown as jest.Mocked<ConversationState>;
    mockCore = {
      service: {
        mls: {
          on: jest.fn(),
        },
        e2eIdentity: {},
      },
    } as unknown as jest.Mocked<Core>;

    handler = new MLSConversationVerificationStateHandler(
      mockOnConversationVerificationStateChange,
      mockConversationState,
      mockCore,
    );

    jest.clearAllMocks();
  });

  it('should do nothing if MLS service is not available', () => {
    mockCore.service.mls = undefined;

    const t = () =>
      registerMLSConversationVerificationStateHandler(
        mockOnConversationVerificationStateChange,
        mockConversationState,
        mockCore,
      );

    expect(t).not.toThrow();
  });

  it('should do nothing if e2eIdentity service is not available', () => {
    mockCore.service.e2eIdentity = undefined;

    registerMLSConversationVerificationStateHandler(
      mockOnConversationVerificationStateChange,
      mockConversationState,
      mockCore,
    );

    // Assert
    expect(mockCore.service?.mls?.on).not.toHaveBeenCalled();
  });

  it('should hook into the newEpoch event of the MLS service', () => {
    registerMLSConversationVerificationStateHandler(
      mockOnConversationVerificationStateChange,
      mockConversationState,
      mockCore,
    );

    // Assert
    expect(mockCore.service.mls.on).toHaveBeenCalledWith('newEpoch', expect.any(Function));
  });

  describe('checkEpoch', () => {
    it('should degrade conversation if not all user entities have certificates', async () => {
      jest.spyOn(handler as any, 'degradeConversation');

      const mockData = {
        groupId,
        epoch: 12345,
      };

      jest.spyOn(handler as any, 'getAllUserEntitiesInConversation').mockResolvedValue({
        isResultComplete: false,
        identities: [],
        qualifiedIds: [],
      });

      await (handler as any).checkEpoch(mockData);

      expect((handler as any).degradeConversation).toHaveBeenCalled();
    });

    it('should verify conversation if all checks pass', async () => {
      jest.spyOn(handler as any, 'verifyConversation');

      const mockData = {
        groupId,
        epoch: 12345,
      };

      jest.spyOn(handler as any, 'getAllUserEntitiesInConversation').mockResolvedValue({
        isResultComplete: true,
        identities: [
          {
            certificate: 'mockCertificate',
          },
        ],
        qualifiedIds: [],
      });

      jest.spyOn(handler as any, 'isCertificateActiveAndValid').mockResolvedValue(true);

      await (handler as any).checkEpoch(mockData); // Calling the private method

      expect((handler as any).verifyConversation).toHaveBeenCalled();
    });
  });
});
