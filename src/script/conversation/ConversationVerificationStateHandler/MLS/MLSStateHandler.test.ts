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
import {E2eiConversationState} from '@wireapp/core/lib/messagingProtocols/mls';

import * as e2eIdentity from 'src/script/E2EIdentity/E2EIdentityVerification';
import {Conversation} from 'src/script/entity/Conversation';
import {Core} from 'src/script/service/CoreSingleton';
import {createUuid} from 'Util/uuid';

import {registerMLSConversationVerificationStateHandler} from './MLSStateHandler';

import {ConversationState} from '../../ConversationState';
import {ConversationVerificationState} from '../../ConversationVerificationState';

describe('MLSConversationVerificationStateHandler', () => {
  const conversationState = new ConversationState();
  let core = new Core();
  const groupId = 'AAEAAKA0LuGtiU7NjqqlZIE2dQUAZWxuYS53aXJlLmxpbms=';
  const conversation = new Conversation(createUuid(), '', ConversationProtocol.MLS);
  conversationState.conversations.push(conversation);
  conversation.groupId = groupId;

  beforeEach(() => {
    core = new Core();
    jest.clearAllMocks();
  });

  it('should do nothing if MLS service is not available', () => {
    core.service!.mls = undefined;

    const t = () => registerMLSConversationVerificationStateHandler(undefined, conversationState, core);

    expect(t).not.toThrow();
  });

  it('should do nothing if e2eIdentity service is not available', () => {
    core.service!.e2eIdentity = undefined;

    registerMLSConversationVerificationStateHandler(undefined, conversationState, core);

    expect(core.service?.mls?.on).not.toHaveBeenCalled();
  });

  describe('checkConversationVerificationState', () => {
    it('should degrade conversation', async () => {
      let triggerEpochChange: Function = () => {};
      conversation.mlsVerificationState(ConversationVerificationState.VERIFIED);
      jest.spyOn(e2eIdentity, 'getConversationVerificationState').mockResolvedValue(E2eiConversationState.Degraded);
      jest
        .spyOn(core.service!.mls!, 'on')
        .mockImplementation((_event, listener) => (triggerEpochChange = listener) as any);

      registerMLSConversationVerificationStateHandler(undefined, conversationState, core);

      triggerEpochChange({groupId});
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(conversation.mlsVerificationState()).toBe(ConversationVerificationState.DEGRADED);
    });

    it('should verify conversation', async () => {
      let triggerEpochChange: Function = () => {};
      conversation.mlsVerificationState(ConversationVerificationState.DEGRADED);
      jest.spyOn(e2eIdentity, 'getConversationVerificationState').mockResolvedValue(E2eiConversationState.Verified);
      jest
        .spyOn(core.service!.mls!, 'on')
        .mockImplementation((_event, listener) => (triggerEpochChange = listener) as any);

      registerMLSConversationVerificationStateHandler(undefined, conversationState, core);

      triggerEpochChange({groupId});
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(conversation.mlsVerificationState()).toBe(ConversationVerificationState.VERIFIED);
    });
  });
});
