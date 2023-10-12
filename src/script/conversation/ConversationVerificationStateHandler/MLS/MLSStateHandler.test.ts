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
import {getLogger, Logger} from 'Util/Logger';
import {createUuid} from 'Util/uuid';

import {MLSConversationVerificationStateHandler} from './MLSStateHandler';

import {ConversationState} from '../../ConversationState';

jest.mock('Util/Logger', () => ({
  getLogger: jest.fn().mockReturnValue({
    error: jest.fn(),
    log: jest.fn(),
  }),
}));

describe('MLSConversationVerificationStateHandler', () => {
  const uuid = createUuid();
  let handler: MLSConversationVerificationStateHandler;
  let mockOnConversationVerificationStateChange: jest.Mock;
  let mockConversationState: jest.Mocked<ConversationState>;
  let mockCore: jest.Mocked<Core>;
  let logger: jest.Mocked<Logger>;
  const conversation: Conversation = new Conversation(uuid, '', ConversationProtocol.MLS);
  const groupId = 'groupIdXYZ';

  beforeEach(() => {
    jest.clearAllMocks();
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
    logger = getLogger('MLSConversationVerificationStateHandler') as jest.Mocked<Logger>;
  });

  it('should log an error if MLS service is not available', () => {
    mockCore.service.mls = undefined;

    new MLSConversationVerificationStateHandler(
      mockOnConversationVerificationStateChange,
      mockConversationState,
      mockCore,
    );

    // Assert
    expect(logger.error).toHaveBeenCalledWith('MLS service not available');
  });

  it('should log an error if e2eIdentity service is not available', () => {
    mockCore.service.e2eIdentity = undefined;

    new MLSConversationVerificationStateHandler(
      mockOnConversationVerificationStateChange,
      mockConversationState,
      mockCore,
    );

    // Assert
    expect(logger.error).toHaveBeenCalledWith('E2E identity service not available');
  });

  it('should hook into the newEpoch event of the MLS service', () => {
    new MLSConversationVerificationStateHandler(
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
