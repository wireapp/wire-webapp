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

import {amplify} from 'amplify';

import {CONVERSATION_PROTOCOL} from '../../apiClient/team/feature/featureList.types';
import {MessageTimer} from '../../core/conversation/messageTimer/messageTimer';
import type {Outbox} from '../../outbox';
import {serverTimeHandler} from '../../time/serverTimeHandler';
import {createCoreTestFixture} from '../../util/test/createCoreTestFixture';
import {translateForTest} from '../../util/test/translateForTest';
import {WebAppEvents} from '../../webAppEvents';
import {AssetRepository} from '../assets/assetRepository';
import {AudioRepository} from '../audio/audioRepository';
import {ClientEntity} from '../client/ClientEntity';
import {ClientState} from '../client/ClientState';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';
import {EventRepository} from '../event/EventRepository';
import {EventService} from '../event/EventService';
import {NOTIFICATION_HANDLING_STATE} from '../event/NotificationHandlingState';
import {PropertiesRepository} from '../properties/propertiesRepository';
import {TeamState} from '../team/TeamState';
import {UserRepository} from '../user/userRepository';
import {UserState} from '../user/userState';

import {ConversationRepository} from './ConversationRepository';
import {ConversationState} from './ConversationState';
import {MessageRepository} from './MessageRepository';

function buildMessageRepository(outbox?: Outbox): MessageRepository {
  const selfUser = new User('selfid', '', translateForTest);
  selfUser.isMe = true;
  const userState = new UserState();
  userState.self(selfUser);
  const clientState = new ClientState();
  clientState.currentClient = new ClientEntity(true, '');
  const conversationState = new ConversationState(userState);
  const selfConversation = new Conversation(selfUser.id, '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
  conversationState.conversations([selfConversation]);

  return new MessageRepository(
    () => {
      return {} as ConversationRepository;
    },
    new CryptographyRepository({} as any),
    new EventRepository(new EventService({} as any), {} as any, {} as any, {} as any),
    new PropertiesRepository({} as any, {} as any, translateForTest),
    serverTimeHandler,
    {} as UserRepository,
    {} as AssetRepository,
    new AudioRepository(),
    translateForTest,
    outbox,
    userState,
    clientState,
    conversationState,
    new TeamState(),
    createCoreTestFixture({service: {conversation: {send: jest.fn(), messageTimer: new MessageTimer()}}}),
  );
}

function createOutboxSpy(): Pick<Outbox, 'pause' | 'resume'> & Outbox {
  return {pause: jest.fn(), resume: jest.fn()} as unknown as Pick<Outbox, 'pause' | 'resume'> & Outbox;
}

describe('MessageRepository outbox lifecycle', () => {
  const notificationHandlingStates = [
    [NOTIFICATION_HANDLING_STATE.RECOVERY],
    [NOTIFICATION_HANDLING_STATE.STREAM],
    [NOTIFICATION_HANDLING_STATE.CLOSED],
  ] as const;

  afterEach(() => {
    amplify.unsubscribeAll(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE);
  });

  it('resumes the outbox when the notification handling state becomes WEB_SOCKET', () => {
    const outbox = createOutboxSpy();
    buildMessageRepository(outbox);

    amplify.publish(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, NOTIFICATION_HANDLING_STATE.WEB_SOCKET);

    expect(outbox.resume).toHaveBeenCalledTimes(1);
    expect(outbox.pause).not.toHaveBeenCalled();
  });

  it.each(notificationHandlingStates)('pauses the outbox when the notification handling state is %s', state => {
    const outbox = createOutboxSpy();
    buildMessageRepository(outbox);

    amplify.publish(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, state);

    expect(outbox.pause).toHaveBeenCalledTimes(1);
    expect(outbox.resume).not.toHaveBeenCalled();
  });

  it('handles notification handling states without an outbox', () => {
    buildMessageRepository();

    expect(() => {
      amplify.publish(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
    }).not.toThrow();
  });
});
