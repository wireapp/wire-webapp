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

import {createFireAndForgetInvoker, type FireAndForgetInvoker} from '@enormora/fire-and-forget';
import {amplify} from 'amplify';

import {BackendError} from '../../apiClient/http/backendError';
import {BackendErrorLabel} from '../../apiClient/http/backendErrorLabel';
import {NetworkError} from '../../apiClient/http/networkError';
import {CONVERSATION_PROTOCOL} from '../../apiClient/team/feature/featureList.types';
import {MessageSendingState} from '../../core/conversation';
import {MessageTimer} from '../../core/conversation/messageTimer/messageTimer';
import {StatusType} from '../../message/statusType';
import type {AttemptOutcome, Kind, Outbox} from '../../outbox';
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
import type {MessagePayload} from './outbox/messageOutboxTypes';
import {createSimpleStorage} from './outbox/testing/createOutboxRepository';

const CONVERSATION_ID = {id: 'conversation-1', domain: 'wire.test'};

type MessageRepositoryParts = {
  repository: MessageRepository;
  conversation: Conversation;
  conversationState: ConversationState;
  eventService: EventService;
  send: jest.Mock;
  invoker: FireAndForgetInvoker;
};

function buildMessageRepositoryParts(outbox?: Outbox): MessageRepositoryParts {
  const selfUser = new User('selfid', '', translateForTest);
  selfUser.isMe = true;
  const userState = new UserState();
  userState.self(selfUser);
  const clientState = new ClientState();
  clientState.currentClient = new ClientEntity(true, '');
  const conversationState = new ConversationState(userState);
  const selfConversation = new Conversation(selfUser.id, '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
  const conversation = new Conversation(
    CONVERSATION_ID.id,
    CONVERSATION_ID.domain,
    CONVERSATION_PROTOCOL.PROTEUS,
    translateForTest,
  );
  conversationState.conversations([selfConversation, conversation]);
  const eventService = new EventService(createSimpleStorage(new Map()));
  const send = jest.fn();
  const invoker = createFireAndForgetInvoker({reportError: jest.fn()});

  const repository = new MessageRepository(
    () => {
      return {checkMessageTimer: jest.fn()} as unknown as ConversationRepository;
    },
    new CryptographyRepository({} as any),
    new EventRepository(eventService, {} as any, {} as any, {} as any),
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
    createCoreTestFixture({service: {conversation: {send, messageTimer: new MessageTimer()}}}),
    invoker,
  );
  return {repository, conversation, conversationState, eventService, send, invoker};
}

function buildMessageRepository(outbox?: Outbox): MessageRepository {
  return buildMessageRepositoryParts(outbox).repository;
}

type OutboxSpy = Outbox & {
  pause: jest.Mock;
  resume: jest.Mock;
  register: jest.Mock<ReturnType<Outbox['register']>, Parameters<Outbox['register']>>;
};

function createOutboxSpy(): OutboxSpy {
  return {
    pause: jest.fn(),
    resume: jest.fn(),
    register: jest.fn(() => {
      return {outcome: 'kind-registered', handle: {}};
    }),
  } as unknown as OutboxSpy;
}

describe('MessageRepository reviewing restored holds', () => {
  afterEach(() => {
    amplify.unsubscribeAll(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE);
  });

  function createLanesOutbox(): {outbox: OutboxSpy; lanes: jest.Mock} {
    const outbox = createOutboxSpy();
    const lanes = jest.fn(() => {
      return {outcome: 'lanes-listed', lanes: []};
    });
    Object.assign(outbox, {lanes});
    return {outbox, lanes};
  }

  it('looks for restored holds only when asked to, not when a conversation becomes the active one', () => {
    const {outbox, lanes} = createLanesOutbox();
    const {repository, conversation, conversationState} = buildMessageRepositoryParts(outbox);

    conversationState.activeConversation(conversation);
    expect(lanes).not.toHaveBeenCalled();

    repository.reviewRestoredHolds();
    expect(lanes).toHaveBeenCalledTimes(1);
  });

  it('does nothing without an outbox', () => {
    const {repository} = buildMessageRepositoryParts();

    expect(() => {
      repository.reviewRestoredHolds();
    }).not.toThrow();
  });
});

describe('MessageRepository outbox registration', () => {
  afterEach(() => {
    amplify.unsubscribeAll(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE);
  });

  it('registers the four message kinds', () => {
    const outbox = createOutboxSpy();

    buildMessageRepository(outbox);

    const registeredNames = outbox.register.mock.calls.map(([kind]) => {
      return kind.name;
    });

    expect(registeredNames).toEqual(['message', 'ping', 'receipt', 'message-change']);
  });

  it.each([{outcome: 'kind-name-taken', kind: 'message'} as const, {outcome: 'outbox-already-started'} as const])(
    'throws when the outbox answers %p, because the wiring is wrong',
    answer => {
      const outbox = createOutboxSpy();
      outbox.register.mockReturnValue(answer);

      expect(() => {
        buildMessageRepository(outbox);
      }).toThrow(/outbox kind/);
    },
  );

  it('registers nothing without an outbox', () => {
    expect(() => {
      buildMessageRepository();
    }).not.toThrow();
  });
});

describe('MessageRepository as the port of the message kinds', () => {
  const textPayload = {
    type: 'text' as const,
    conversationId: CONVERSATION_ID,
    messageId: 'message-1',
    text: 'hello',
    mentions: [],
  };

  afterEach(() => {
    amplify.unsubscribeAll(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE);
  });

  type PortContext = MessageRepositoryParts & {
    messageKind: Kind<MessagePayload>;
    storedMessage: {status: jest.Mock; ephemeral_expires: jest.Mock};
    updateEvent: jest.SpyInstance;
  };

  function createObservable<T>(initial: T): jest.Mock {
    let value = initial;
    return jest.fn((next?: T) => {
      if (next !== undefined) {
        value = next;
      }
      return value;
    });
  }

  function setup(): PortContext {
    const outbox = createOutboxSpy();
    const parts = buildMessageRepositoryParts(outbox);
    const messageKind = outbox.register.mock.calls[0][0] as Kind<MessagePayload>;
    const storedMessage = {
      status: jest.fn(),
      ephemeral_expires: createObservable<boolean | number>(false),
      failed_reason: jest.fn(),
      written_time: jest.fn(),
      primary_key: 'primary-key',
      readReceipts: () => {
        return [];
      },
      type: 'conversation.message-add',
      hasAssetImage: () => {
        return false;
      },
      timestamp: jest.fn(),
    };
    jest.spyOn(parts.conversation, 'getMessage').mockReturnValue(storedMessage as any);
    jest.spyOn(parts.conversation, 'updateTimestamps').mockImplementation();
    jest.spyOn(parts.conversation, 'updateTimestampServer').mockImplementation();
    jest.spyOn(parts.eventService, 'loadEvent').mockResolvedValue({
      primary_key: 'primary-key',
      status: StatusType.SENDING,
    } as any);
    const updateEvent = jest.spyOn(parts.eventService, 'updateEvent').mockResolvedValue({} as any);
    return {...parts, messageKind, storedMessage, updateEvent};
  }

  function attempt(messageKind: Kind<MessagePayload>, payload: MessagePayload): Promise<AttemptOutcome> {
    return messageKind.attempt(
      {
        id: 'operation',
        kind: 'message',
        payload,
        correlation: {state: 'uncorrelated'},
        lane: {state: 'no-lane'},
        queuedAt: 0,
        state: 'in-progress',
        attempts: 1,
      },
      new AbortController().signal,
    );
  }

  it('sends a text through the core without showing it again, and answers succeeded', async () => {
    const {messageKind, send} = setup();
    send.mockResolvedValue({
      id: 'message-1',
      sentAt: new Date().toISOString(),
      state: MessageSendingState.OUTGOING_SENT,
    });

    await expect(attempt(messageKind, textPayload)).resolves.toEqual({outcome: 'attempt-succeeded'});

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].payload.messageId).toBe('message-1');
  });

  describe('the timer of a message that is sent later than it was shown', () => {
    const ONE_SECOND = 1000;
    const TEN_SECONDS = 10 * ONE_SECOND;

    function sentTimer(send: jest.Mock): number | undefined {
      const expireAfterMillis = send.mock.calls[0][0].payload.ephemeral?.expireAfterMillis;
      return expireAfterMillis === undefined ? undefined : Number(expireAfterMillis);
    }

    it('gives the shown copy the timer the conversation has when the message is sent', async () => {
      const {messageKind, send, conversation, storedMessage, updateEvent} = setup();
      jest.spyOn(conversation, 'messageTimer').mockReturnValue(TEN_SECONDS);
      send.mockResolvedValue({
        id: 'message-1',
        sentAt: new Date().toISOString(),
        state: MessageSendingState.OUTGOING_SENT,
      });

      await attempt(messageKind, textPayload);

      expect(sentTimer(send)).toBe(TEN_SECONDS);
      expect(storedMessage.ephemeral_expires()).toBe(TEN_SECONDS);
      expect(updateEvent).toHaveBeenCalledWith('primary-key', {ephemeral_expires: TEN_SECONDS});
    });

    it('turns a shown self-deleting copy into a normal one when the conversation has no timer anymore', async () => {
      const {messageKind, send, storedMessage, updateEvent} = setup();
      storedMessage.ephemeral_expires(TEN_SECONDS);
      send.mockResolvedValue({
        id: 'message-1',
        sentAt: new Date().toISOString(),
        state: MessageSendingState.OUTGOING_SENT,
      });

      await attempt(messageKind, textPayload);

      expect(sentTimer(send)).toBeUndefined();
      expect(storedMessage.ephemeral_expires()).toBe(false);
      expect(updateEvent).toHaveBeenCalledWith('primary-key', {ephemeral_expires: undefined});
    });

    it('leaves a copy that was sent already as it is', async () => {
      const {messageKind, send, conversation, storedMessage, updateEvent} = setup();
      jest.spyOn(conversation, 'messageTimer').mockReturnValue(TEN_SECONDS);
      storedMessage.status.mockReturnValue(StatusType.SENT);
      send.mockResolvedValue({
        id: 'message-1',
        sentAt: new Date().toISOString(),
        state: MessageSendingState.OUTGOING_SENT,
      });

      await attempt(messageKind, textPayload);

      expect(storedMessage.ephemeral_expires()).toBe(false);
      expect(updateEvent).not.toHaveBeenCalledWith(
        'primary-key',
        expect.objectContaining({ephemeral_expires: expect.anything()}),
      );
    });
  });

  it('writes the failure and its reason on the record when the backend refuses a text', async () => {
    const {messageKind, send, storedMessage, updateEvent} = setup();
    send.mockRejectedValue(new BackendError('removed', BackendErrorLabel.CLIENT_ERROR, 403));

    await expect(attempt(messageKind, textPayload)).resolves.toEqual({outcome: 'attempt-dead-lettered'});

    expect(storedMessage.status).toHaveBeenCalledWith(StatusType.FAILED);
    expect(updateEvent).toHaveBeenCalledWith('primary-key', {status: StatusType.FAILED, failed_reason: 'removed'});
  });

  it('marks a federation error with its status', async () => {
    const {messageKind, send, storedMessage, updateEvent} = setup();
    send.mockRejectedValue(new BackendError('remote', BackendErrorLabel.FEDERATION_REMOTE_ERROR, 533 as never));

    await expect(attempt(messageKind, textPayload)).resolves.toEqual({outcome: 'attempt-dead-lettered'});

    expect(storedMessage.status).toHaveBeenCalledWith(StatusType.FEDERATION_ERROR);
    expect(updateEvent).toHaveBeenCalledWith('primary-key', {
      status: StatusType.FEDERATION_ERROR,
      failed_reason: 'rejected',
    });
  });

  it('asks for a retry when the core cannot reach the backend, and marks nothing', async () => {
    const {messageKind, send, updateEvent} = setup();
    send.mockRejectedValue(new NetworkError('offline'));

    await expect(attempt(messageKind, textPayload)).resolves.toEqual({outcome: 'attempt-failed'});

    expect(updateEvent).not.toHaveBeenCalled();
  });

  it('removes a message the outbox deleted from the record and from the screen', async () => {
    const {messageKind, eventService, invoker} = setup();
    const deleteEvent = jest.spyOn(eventService, 'deleteEvent').mockResolvedValue(1);
    const removed = jest.fn();
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, removed);

    messageKind.onChanged?.({
      id: 'operation',
      kind: 'message',
      payload: textPayload,
      correlation: {state: 'uncorrelated'},
      lane: {state: 'no-lane'},
      queuedAt: 0,
      state: 'deleted',
      attempts: 1,
    });
    await invoker.waitUntilAllSettled();

    expect(deleteEvent).toHaveBeenCalledWith(CONVERSATION_ID.id, 'message-1');
    expect(removed).toHaveBeenCalledWith('message-1', CONVERSATION_ID.id);
    amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, removed);
  });

  describe('a held message whose send was attempted', () => {
    async function release(messageKind: Kind<MessagePayload>, invoker: FireAndForgetInvoker): Promise<void> {
      messageKind.onChanged?.({
        id: 'operation',
        kind: 'message',
        payload: textPayload,
        correlation: {state: 'uncorrelated'},
        lane: {state: 'no-lane'},
        queuedAt: 0,
        state: 'in-progress',
        attempts: 1,
      });
      await invoker.waitUntilAllSettled();
    }

    it('is not shown again when an edit replaced its record', async () => {
      const {messageKind, eventService, repository, invoker} = setup();
      const inject = jest.spyOn(repository as any, 'injectOptimisticMessage').mockResolvedValue(true);
      jest.spyOn(eventService, 'loadEvent').mockResolvedValue({
        primary_key: 'edit-key',
        id: 'edit-id',
        data: {replacing_message_id: 'message-1'},
        status: StatusType.SENT,
      } as any);

      await release(messageKind, invoker);

      expect(inject).not.toHaveBeenCalled();
    });

    it('is shown again when no record is left', async () => {
      const {messageKind, eventService, repository, invoker} = setup();
      const inject = jest.spyOn(repository as any, 'injectOptimisticMessage').mockResolvedValue(true);
      jest.spyOn(repository as any, 'buildOutboxText').mockResolvedValue({} as any);
      jest.spyOn(eventService, 'loadEvent').mockResolvedValue(undefined);

      await release(messageKind, invoker);

      expect(inject).toHaveBeenCalledTimes(1);
    });
  });

  it('answers deleted for a conversation it does not know', async () => {
    const {messageKind, send} = setup();

    await expect(
      attempt(messageKind, {...textPayload, conversationId: {id: 'unknown', domain: 'wire.test'}}),
    ).resolves.toEqual({outcome: 'attempt-deleted'});

    expect(send).not.toHaveBeenCalled();
  });
});

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
