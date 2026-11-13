/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {container} from 'tsyringe';

import {DebugUtil} from './debugUtil';

import {CONVERSATION_EVENT} from '../apiClient/event/conversationEvent';
import {CONVERSATION_PROTOCOL} from '../apiClient/team/feature/featureList.types';
import {EVENTS} from '../core/account';
import type {ConversationService} from '../core/conversation';
import {NotificationService, NotificationSource} from '../core/notification';
import {MemoryEngine} from '../core/storage/engine/memoryEngine';
import {ConversationState} from '../repositories/conversation/ConversationState';
import {Conversation} from '../repositories/entity/Conversation';
import {APIClient} from '../service/apiClientSingleton';
import {Core} from '../service/coreSingleton';
import type {ViewModelRepositories} from '../view_model/MainViewModel';
import {translateForTest} from './test/translateForTest';

describe('DebugUtil MLS event dropping', () => {
  it('clears the displayed target and resumes processing when notification services are replaced', async () => {
    const core = container.resolve(Core);
    const apiClient = container.resolve(APIClient);
    const conversationState = container.resolve(ConversationState);
    const originalServices = core.service;
    const originalConversation = conversationState.activeConversation();
    const conversation = new Conversation(
      'conversation-id',
      'example.com',
      CONVERSATION_PROTOCOL.MLS,
      translateForTest,
    );
    conversation.groupId = 'group-id';
    const handleEvent = jest.fn(async () => {
      return {status: 'unhandled' as const};
    });
    const conversationService = {handleEvent} as unknown as ConversationService;
    const store = new MemoryEngine();
    await store.init('DebugUtil.test');
    const notification = new NotificationService(apiClient, store, conversationService);
    core.service = {...core.service, notification} as NonNullable<Core['service']>;
    conversationState.activeConversation(conversation);
    const debug = new DebugUtil({} as ViewModelRepositories);
    const displayedTargets = jest.fn();
    const subscription = debug.ignoredMLSConversation.subscribe(displayedTargets);
    const event = {
      type: CONVERSATION_EVENT.MLS_WELCOME_MESSAGE as const,
      conversation: conversation.id,
      qualified_conversation: conversation.qualifiedId,
      data: '',
      from: '',
      time: '',
    };
    const incoming = {id: 'notification-id', payload: [event], transient: true};

    try {
      debug.setIgnoreIncomingMLS(true);
      expect(debug.ignoredMLSConversation()).toEqual(conversation.qualifiedId);
      await expect(notification.handleNotification(incoming, NotificationSource.WEBSOCKET).next()).resolves.toEqual({
        done: true,
        value: undefined,
      });
      expect(handleEvent).not.toHaveBeenCalled();

      const replacement = new NotificationService(apiClient, store, conversationService);
      core.service = {...core.service, notification: replacement} as NonNullable<Core['service']>;
      core.emit(EVENTS.SERVICES_CHANGED);

      expect(debug.ignoredMLSConversation()).toBeUndefined();
      expect(displayedTargets).toHaveBeenLastCalledWith(undefined);
      await expect(replacement.handleNotification(incoming, NotificationSource.WEBSOCKET).next()).resolves.toEqual({
        done: false,
        value: {event},
      });
      expect(handleEvent).toHaveBeenCalledWith(event);
    } finally {
      subscription.dispose();
      core.service = originalServices;
      conversationState.activeConversation(originalConversation);
    }
  });
});
