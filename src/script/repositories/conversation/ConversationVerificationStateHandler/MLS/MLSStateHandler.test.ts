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

import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {E2eiConversationState} from '@wireapp/core/lib/messagingProtocols/mls';

import {Conversation} from 'Repositories/entity/Conversation';
import * as e2eIdentity from 'src/script/E2EIdentity';
import {Core} from 'src/script/service/CoreSingleton';
import {createUuid} from 'Util/uuid';
import {waitFor} from 'Util/waitFor';

import {MLSConversationVerificationStateHandler} from './MLSStateHandler';

import {ConversationState} from '../../ConversationState';
import {ConversationVerificationState} from '../../ConversationVerificationState';

jest.mock('src/script/E2EIdentity', () => ({
  ...jest.requireActual('src/script/E2EIdentity'),
  getConversationVerificationState: jest.fn(),
  E2EIHandler: {
    getInstance: jest.fn().mockReturnValue({
      isE2EIEnabled: jest.fn(),
    }),
  },
}));

describe('MLSConversationVerificationStateHandler', () => {
  const conversationState = new ConversationState();
  let core: Core;
  const e2eiHandler = e2eIdentity.E2EIHandler.getInstance();
  const groupId = 'AAEAAKA0LuGtiU7NjqqlZIE2dQUAZWxuYS53aXJlLmxpbms=';
  const conversation = new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.MLS);
  conversationState.conversations.push(conversation);
  conversation.groupId = groupId;

  beforeEach(() => {
    core = new Core();
    jest.clearAllMocks();
    core.isMLSActiveForClient = jest.fn().mockReturnValue(true);
    e2eiHandler.isE2EIEnabled = jest.fn().mockReturnValue(true);
  });

  it('should do nothing if MLS feature is not active', () => {
    core.isMLSActiveForClient = jest.fn().mockReturnValue(false);

    new MLSConversationVerificationStateHandler(
      'domain',
      () => {},
      async () => {},
      conversationState,
      core,
    );

    expect(core.service?.mls?.conversationExists).not.toHaveBeenCalled();
  });

  it('should do nothing if E2EI feature is not active', () => {
    e2eiHandler.isE2EIEnabled = jest.fn().mockReturnValue(false);

    new MLSConversationVerificationStateHandler(
      'domain',
      () => {},
      async () => {},
      conversationState,
      core,
    );

    expect(core.service?.mls?.conversationExists).not.toHaveBeenCalled();
  });

  it('should do nothing if MLS service is not available', () => {
    core.service!.mls = undefined;

    const t = () =>
      new MLSConversationVerificationStateHandler(
        'domain',
        () => {},
        async () => {},
        conversationState,
        core,
      );

    expect(t).not.toThrow();
  });

  it('should do nothing if e2eIdentity service is not available', () => {
    core.service!.e2eIdentity = undefined;

    new MLSConversationVerificationStateHandler(
      'domain',
      () => {},
      async () => {},
      conversationState,
      core,
    );

    expect(core.service?.mls?.on).not.toHaveBeenCalled();
  });

  it('should do nothing if the user does not have an mls device', () => {
    jest.spyOn(core, 'hasMLSDevice', 'get').mockReturnValue(false);

    new MLSConversationVerificationStateHandler(
      'domain',
      () => {},
      async () => {},
      conversationState,
      core,
    );

    expect(core.service?.mls?.on).not.toHaveBeenCalled();
  });

  describe('checkConversationVerificationState', () => {
    it('should reset to unverified if mls group does not exist anymore', async () => {
      let triggerEpochChange: Function = () => {};
      conversation.mlsVerificationState(ConversationVerificationState.VERIFIED);
      jest.spyOn(core.service!.mls!, 'conversationExists').mockResolvedValueOnce(false);

      jest
        .spyOn(core.service!.mls!, 'on')
        .mockImplementation((_event, listener) => (triggerEpochChange = listener) as any);

      new MLSConversationVerificationStateHandler(
        'domain',
        () => {},
        async () => {},
        conversationState,
        core,
      );

      triggerEpochChange({groupId});
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(conversation.mlsVerificationState()).toBe(ConversationVerificationState.UNVERIFIED);
    });

    it('should degrade conversation', async () => {
      let triggerEpochChange: Function = () => {};
      conversation.mlsVerificationState(ConversationVerificationState.VERIFIED);
      jest.spyOn(core.service!.mls!, 'conversationExists').mockResolvedValueOnce(true);

      jest.spyOn(e2eIdentity, 'getConversationVerificationState').mockResolvedValue(E2eiConversationState.NotVerified);
      jest
        .spyOn(core.service!.mls!, 'on')
        .mockImplementation((_event, listener) => (triggerEpochChange = listener) as any);

      new MLSConversationVerificationStateHandler(
        'domain',
        () => {},
        async () => {},
        conversationState,
        core,
      );

      triggerEpochChange({groupId});
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(conversation.mlsVerificationState()).toBe(ConversationVerificationState.DEGRADED);
    });

    it('should not degrade conversation if it is not verified', async () => {
      let triggerEpochChange: Function = () => {};
      conversation.mlsVerificationState(ConversationVerificationState.UNVERIFIED);

      jest.spyOn(core.service!.mls!, 'conversationExists').mockResolvedValueOnce(true);

      jest.spyOn(e2eIdentity, 'getConversationVerificationState').mockResolvedValue(E2eiConversationState.NotVerified);
      jest
        .spyOn(core.service!.mls!, 'on')
        .mockImplementation((_event, listener) => (triggerEpochChange = listener) as any);

      new MLSConversationVerificationStateHandler(
        'domain',
        () => {},
        async () => {},
        conversationState,
        core,
      );

      triggerEpochChange({groupId});
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(conversation.mlsVerificationState()).toBe(ConversationVerificationState.UNVERIFIED);
    });

    it('should verify conversation', async () => {
      let triggerEpochChange: Function = () => {};
      conversation.mlsVerificationState(ConversationVerificationState.DEGRADED);

      jest.spyOn(core.service!.mls!, 'conversationExists').mockResolvedValueOnce(true);

      jest.spyOn(e2eIdentity, 'getConversationVerificationState').mockResolvedValue(E2eiConversationState.Verified);
      jest
        .spyOn(core.service!.mls!, 'on')
        .mockImplementation((_event, listener) => (triggerEpochChange = listener) as any);

      new MLSConversationVerificationStateHandler(
        'domain',
        () => {},
        async () => {},
        conversationState,
        core,
      );

      triggerEpochChange({groupId});
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(conversation.mlsVerificationState()).toBe(ConversationVerificationState.VERIFIED);
    });

    it('should wait for conversation to be known', async () => {
      let triggerEpochChange: Function = () => {};

      jest.spyOn(core.service!.mls!, 'conversationExists').mockResolvedValueOnce(true);

      const newConversation = new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.MLS);
      newConversation.groupId = 'AAEAAAOygT3TL0wljoaNabgK4yIAZWxuYS53aXJlLmxpbms=';

      jest.spyOn(e2eIdentity, 'getConversationVerificationState').mockResolvedValue(E2eiConversationState.Verified);
      jest
        .spyOn(core.service!.mls!, 'on')
        .mockImplementation((_event, listener) => (triggerEpochChange = listener) as any);

      new MLSConversationVerificationStateHandler(
        'domain',
        () => {},
        async () => {},
        conversationState,
        core,
      );

      triggerEpochChange({groupId: newConversation.groupId});
      setTimeout(() => {
        // adding the conversation after the epoch change event was triggered
        conversationState.conversations.push(newConversation);
      }, 100);
      await waitFor(() => newConversation.mlsVerificationState() === ConversationVerificationState.VERIFIED);
      expect(newConversation.mlsVerificationState()).toBe(ConversationVerificationState.VERIFIED);
    });
  });
});
