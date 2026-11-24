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
import ko from 'knockout';

import {Confirmation} from '@wireapp/protocol-messaging';

import {CONVERSATION_PROTOCOL} from '../../apiClient/team/feature/featureList.types';
import {MessageTimer} from '../../core/conversation/messageTimer/messageTimer';
import {QuoteEntity} from '../../message/quoteEntity';
import {StatusType} from '../../message/statusType';
import {createOutbox, type Outbox, type OperationSnapshot} from '../../outbox';
import {createFakeClock, type FakeClock} from '../../outbox/testing/createFakeClock';
import {createInMemoryOutboxStore, type InMemoryOutboxStore} from '../../outbox/testing/createInMemoryOutboxStore';
import {createStoredSnapshot} from '../../outbox/testing/createOutboxTestKit';
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
import type {Message} from '../entity/message/message';
import {User} from '../entity/User';
import {EventRepository} from '../event/EventRepository';
import {EventService} from '../event/EventService';
import {PropertiesRepository} from '../properties/propertiesRepository';
import {TeamState} from '../team/TeamState';
import {UserRepository} from '../user/userRepository';
import {UserState} from '../user/userState';

import {ConversationRepository} from './ConversationRepository';
import {ConversationState} from './ConversationState';
import {MessageRepository} from './MessageRepository';
import {WEEK_MILLISECONDS} from './outbox/durations';

const CONVERSATION_ID = {id: 'conversation-1', domain: 'wire.test'};
const SENDER_ID = {id: 'sender-1', domain: 'wire.test'};

type Parts = {
  repository: MessageRepository;
  conversation: Conversation;
  eventService: EventService;
  audioRepository: AudioRepository;
  store: InMemoryOutboxStore;
  clock: FakeClock;
  outbox: Outbox;
  send: jest.Mock;
  inject: jest.SpyInstance;
  updateEvent: jest.SpyInstance;
  storedMessage: {status: jest.Mock; failed_reason: jest.Mock; written_time: jest.Mock};
  /** What the repository did, in the order it did it: the store's appends and the injections */
  order: string[];
};

function buildParts(): Parts {
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
  const eventService = new EventService({} as any);
  const audioRepository = new AudioRepository();
  jest.spyOn(audioRepository, 'play').mockResolvedValue(undefined as never);
  const send = jest.fn();
  const clock = createFakeClock();
  const store = createInMemoryOutboxStore();
  const outbox = createOutbox();

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
    audioRepository,
    translateForTest,
    outbox,
    userState,
    clientState,
    conversationState,
    new TeamState(),
    createCoreTestFixture({service: {conversation: {send, messageTimer: new MessageTimer()}}}),
  );

  const order: string[] = [];
  const append = store.append.bind(store);
  jest.spyOn(store, 'append').mockImplementation(async snapshot => {
    order.push(`append:${snapshot.trigger}`);
    return append(snapshot);
  });
  const inject = jest.spyOn(repository as any, 'injectOptimisticMessage').mockImplementation(async () => {
    order.push('inject');
    return true;
  });

  const storedMessage = {
    status: jest.fn(),
    failed_reason: jest.fn(),
    written_time: jest.fn(),
    primary_key: 'primary-key',
  };
  jest.spyOn(conversation, 'getMessage').mockReturnValue(storedMessage as unknown as Message);
  jest.spyOn(eventService, 'loadEvent').mockResolvedValue({primary_key: 'primary-key', status: StatusType.SENDING} as any);
  const updateEvent = jest.spyOn(eventService, 'updateEvent').mockImplementation(async () => {
    order.push('updateEvent');
    return {} as any;
  });

  return {
    repository,
    conversation,
    eventService,
    audioRepository,
    store,
    clock,
    outbox,
    send,
    inject,
    updateEvent,
    storedMessage,
    order,
  };
}

async function startOutbox({store, clock, outbox}: Parts, maxOperations?: number): Promise<void> {
  const outcome = await outbox.start({
    store,
    getServerTime: clock.getServerTime,
    logger: {info: jest.fn(), warn: jest.fn(), error: jest.fn()},
    configuration: {maxOperations},
  });
  expect(outcome.type).toBe('outbox-started');
  await clock.settle();
}

/** The latest snapshot of the only operation the store has */
function onlySnapshot(store: InMemoryOutboxStore): OperationSnapshot {
  const [id, ...others] = store.operationIds();
  expect(others).toEqual([]);
  return store.history(id).at(-1) as OperationSnapshot;
}

describe('MessageRepository routing sends through the outbox', () => {
  let parts: Parts;

  beforeEach(() => {
    parts = buildParts();
  });

  afterEach(() => {
    parts.clock.dispose();
    amplify.unsubscribeAll(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE);
    amplify.unsubscribeAll(WebAppEvents.NOTIFICATION.REMOVE_READ);
  });

  describe('a text message', () => {
    function sendText(options: {messageId?: string; quote?: QuoteEntity} = {}): Promise<void> {
      return parts.repository.sendTextWithLinkPreview({
        conversation: parts.conversation,
        textMessage: 'hello',
        mentions: [],
        QuoteEntity: options.quote as never,
        messageId: options.messageId,
      });
    }

    it('stores the operation, then shows the message, and sends nothing itself', async () => {
      await startOutbox(parts);

      await expect(sendText()).resolves.toBeUndefined();

      const snapshot = onlySnapshot(parts.store);
      expect(snapshot).toEqual(
        expect.objectContaining({
          kind: 'message',
          state: 'queued',
          orderingKey: CONVERSATION_ID.id,
          payload: expect.objectContaining({
            type: 'text',
            text: 'hello',
            mentions: [],
            conversationId: CONVERSATION_ID,
          }),
        }),
      );
      expect(snapshot.correlationKey).toBe((snapshot.payload as {messageId: string}).messageId);
      expect(parts.order).toEqual(['append:operation-queued', 'inject']);
      expect(parts.send).not.toHaveBeenCalled();
    });

    it('keeps only the ids of a quote, and uses the quote it was given to show the message', async () => {
      await startOutbox(parts);
      const quote = new QuoteEntity({hash: new Uint8Array([1]).buffer, messageId: 'quoted-1', userId: 'quoted-user'});

      await sendText({quote});

      expect(onlySnapshot(parts.store).payload).toEqual(
        expect.objectContaining({quote: {messageId: 'quoted-1', userId: 'quoted-user'}}),
      );
      expect(parts.inject).toHaveBeenCalledTimes(1);
    });

    it.each([
      {
        outcome: 'outbox-not-started',
        prepare: () => {
          return undefined;
        },
      },
      {
        outcome: 'storage-failed',
        prepare: ({store}: Parts) => {
          store.fail('append', true);
        },
      },
      {
        outcome: 'storage-full',
        prepare: ({store}: Parts) => {
          store.fill(true);
        },
      },
    ])('shows the message as failed when the outbox answers $outcome', async ({outcome, prepare}) => {
      if (outcome !== 'outbox-not-started') {
        await startOutbox(parts);
      }
      prepare(parts);

      await expect(sendText()).resolves.toBeUndefined();

      expect(parts.inject).toHaveBeenCalledTimes(1);
      expect(parts.storedMessage.status).toHaveBeenCalledWith(StatusType.FAILED);
      expect(parts.updateEvent).toHaveBeenCalledWith('primary-key', {
        status: StatusType.FAILED,
        failed_reason: 'rejected',
      });
      expect(parts.send).not.toHaveBeenCalled();
    });

    it('shows the message as failed when the outbox is full', async () => {
      await startOutbox(parts, 0);

      await sendText();

      expect(parts.inject).toHaveBeenCalledTimes(1);
      expect(parts.updateEvent).toHaveBeenCalledWith('primary-key', {
        status: StatusType.FAILED,
        failed_reason: 'rejected',
      });
    });

    describe('Retry', () => {
      const failedPayload = {
        type: 'text' as const,
        conversationId: CONVERSATION_ID,
        messageId: 'message-1',
        text: 'stored text',
        mentions: [],
      };

      function seedDeadLetter(attempts: number, payload: object = failedPayload): void {
        parts.store.seed(
          createStoredSnapshot({
            kind: 'message',
            id: 'operation-1',
            seq: 3,
            trigger: 'operation-dead-lettered',
            correlationKey: 'message-1',
            orderingKey: CONVERSATION_ID.id,
            payload,
            state: 'dead-lettered',
            attempts,
            queuedSeq: 7,
            queuedAt: 1_000_000 - 5000,
            validUntil: 1_000_000 - 1,
          }),
        );
      }

      async function startWithFailedMessage(): Promise<void> {
        jest.spyOn(parts.eventService, 'loadEvent').mockResolvedValue({
          primary_key: 'primary-key',
          status: StatusType.FAILED,
          failed_reason: 'declined',
        } as any);
        await startOutbox(parts);
        parts.updateEvent.mockClear();
        parts.order.length = 0;
      }

      it('queues the dead-lettered operation again as a version of itself, marked as maybe delivered', async () => {
        seedDeadLetter(2);
        await startWithFailedMessage();
        await parts.clock.advance(60_000);

        await sendText({messageId: 'message-1'});

        const snapshot = onlySnapshot(parts.store);
        expect(snapshot).toEqual(
          expect.objectContaining({
            id: 'operation-1',
            trigger: 'operation-versioned',
            state: 'queued',
            attempts: 0,
            queuedSeq: 7,
            validUntil: parts.clock.getServerTime() + WEEK_MILLISECONDS,
            payload: {...failedPayload, mayBeDelivered: true},
          }),
        );
      });

      it('does not mark an operation that never went out as maybe delivered', async () => {
        seedDeadLetter(0);
        await startWithFailedMessage();

        await sendText({messageId: 'message-1'});

        expect(onlySnapshot(parts.store).payload).toEqual(failedPayload);
      });

      it('keeps a mark an earlier retry left', async () => {
        seedDeadLetter(0, {...failedPayload, mayBeDelivered: true});
        await startWithFailedMessage();

        await sendText({messageId: 'message-1'});

        expect(onlySnapshot(parts.store).payload).toEqual({...failedPayload, mayBeDelivered: true});
      });

      it('clears the decline and the failed status on the record before it queues, and shows the message as sending', async () => {
        seedDeadLetter(1);
        await startWithFailedMessage();

        await sendText({messageId: 'message-1'});

        expect(parts.updateEvent).toHaveBeenCalledWith('primary-key', {
          status: StatusType.SENDING,
          failed_reason: undefined,
        });
        expect(parts.storedMessage.status).toHaveBeenLastCalledWith(StatusType.SENDING);
        expect(parts.storedMessage.failed_reason).toHaveBeenLastCalledWith(undefined);
        expect(parts.order).toEqual(['updateEvent', 'append:operation-versioned']);
        expect(parts.inject).not.toHaveBeenCalled();
      });

      it('queues a new operation under the same id when the outbox does not know the message', async () => {
        await startOutbox(parts);

        await sendText({messageId: 'message-1'});

        expect(onlySnapshot(parts.store)).toEqual(
          expect.objectContaining({
            trigger: 'operation-queued',
            correlationKey: 'message-1',
            attempts: 0,
            payload: expect.objectContaining({messageId: 'message-1', text: 'hello'}),
          }),
        );
        expect(parts.inject).not.toHaveBeenCalled();
      });

      it('shows the message as failed again when the outbox refuses it', async () => {
        await startOutbox(parts);
        parts.store.fail('append', true);

        await sendText({messageId: 'message-1'});

        expect(parts.updateEvent).toHaveBeenLastCalledWith('primary-key', {
          status: StatusType.FAILED,
          failed_reason: 'rejected',
        });
      });
    });
  });

  describe('a ping', () => {
    it('stores the operation, plays the sound, shows the ping, and answers that it is queued', async () => {
      await startOutbox(parts);

      const result = await parts.repository.sendPing(parts.conversation);

      const snapshot = onlySnapshot(parts.store);
      expect(snapshot).toEqual(
        expect.objectContaining({
          kind: 'ping',
          state: 'queued',
          orderingKey: CONVERSATION_ID.id,
          correlationKey: result.id,
          validUntil: parts.clock.getServerTime() + 60_000,
          payload: {conversationId: CONVERSATION_ID, messageId: result.id},
        }),
      );
      expect(result.state).toBe('QUEUED');
      expect(parts.order).toEqual(['append:operation-queued', 'inject']);
      expect(parts.audioRepository.play).toHaveBeenCalledTimes(1);
      expect(parts.send).not.toHaveBeenCalled();
    });

    it('shows the ping as failed and answers failed when the outbox refuses it', async () => {
      const result = await parts.repository.sendPing(parts.conversation);

      expect(result.state).toBe('FAILED');
      expect(parts.inject).toHaveBeenCalledTimes(1);
      expect(parts.updateEvent).toHaveBeenCalledWith('primary-key', {
        status: StatusType.FAILED,
        failed_reason: 'rejected',
      });
    });

    it('goes behind the messages of the conversation in the same lane', async () => {
      await startOutbox(parts);

      await parts.repository.sendTextWithLinkPreview({
        conversation: parts.conversation,
        textMessage: 'first',
        mentions: [],
      });
      await parts.repository.sendPing(parts.conversation);

      const lane = parts.outbox.lane(CONVERSATION_ID.id);
      expect(lane).toEqual(expect.objectContaining({type: 'lane-found'}));
      // `size` counts the operations behind the first one
      expect((lane as {lane: {size: number}}).lane.size).toBe(1);
    });
  });

  describe('a send that waits for its message to be shown', () => {
    /** What the screen has at each moment the outbox sends */
    let shown: Set<string>;
    let shownWhenSent: boolean[];
    let release: () => void;
    let sendAttempts: number;

    async function startRunning(): Promise<void> {
      await startOutbox(parts);
      parts.outbox.resume();
      await parts.clock.settle();
    }

    function sentMessage():{id: string; sentAt: string; state: string} {
      return {id: 'sent', sentAt: '2026-01-01T00:00:00.000Z', state: 'OUTGOING_SENT'};
    }

    function sendText(): Promise<void> {
      return parts.repository.sendTextWithLinkPreview({
        conversation: parts.conversation,
        textMessage: 'hello',
        mentions: [],
      });
    }

    function holdInjection({fail}: {fail?: boolean} = {}): void {
      const released = new Promise<void>(resolve => {
        release = resolve;
      });
      parts.inject.mockImplementation(async (message: {messageId: string}) => {
        await released;
        if (fail === true) {
          throw new Error('injection failed');
        }
        shown.add(message.messageId);
        return true;
      });
    }

    beforeEach(() => {
      shown = new Set();
      shownWhenSent = [];
      sendAttempts = 0;
      parts.send.mockImplementation(async ({payload}: {payload: {messageId: string}}) => {
        sendAttempts += 1;
        shownWhenSent.push(shown.has(payload.messageId));
        return sentMessage();
      });
    });

    it('sends only after the message was shown', async () => {
      await startRunning();
      holdInjection();

      const sending = sendText();
      await parts.clock.advance(1_000);
      expect(sendAttempts).toBe(0);

      release();
      await sending;
      await parts.clock.advance(1_000);

      expect(sendAttempts).toBe(1);
      expect(shownWhenSent).toEqual([true]);
    });

    it('waits for a ping that is being shown as well', async () => {
      await startRunning();
      holdInjection();

      const sending = parts.repository.sendPing(parts.conversation);
      await parts.clock.advance(1_000);
      expect(sendAttempts).toBe(0);

      release();
      await sending;
      await parts.clock.advance(1_000);

      expect(shownWhenSent).toEqual([true]);
    });

    it('sends when the injection failed', async () => {
      await startRunning();
      holdInjection({fail: true});

      const sending = sendText();
      const failure = expect(sending).rejects.toThrow('injection failed');
      await parts.clock.advance(1_000);
      expect(sendAttempts).toBe(0);

      release();
      await failure;
      await parts.clock.advance(1_000);

      expect(sendAttempts).toBe(1);
      expect(shownWhenSent).toEqual([false]);
    });

    it('sends a restored operation without waiting', async () => {
      parts.store.seed(
        createStoredSnapshot({
          kind: 'message',
          id: 'operation-1',
          seq: 1,
          trigger: 'operation-queued',
          correlationKey: 'message-1',
          orderingKey: CONVERSATION_ID.id,
          payload: {
            type: 'text',
            conversationId: CONVERSATION_ID,
            messageId: 'message-1',
            text: 'stored text',
            mentions: [],
          },
          state: 'queued',
          queuedSeq: 1,
          queuedAt: 1_000_000 - 5000,
          validUntil: 1_000_000 + WEEK_MILLISECONDS,
        }),
      );
      await startRunning();
      await parts.clock.advance(1_000);

      expect(sendAttempts).toBe(1);
    });
  });

  describe('receipts', () => {
    function receivedMessage(): Message {
      return {
        id: 'received-1',
        type: 'conversation.message-add',
        user: () => {return {isMe: false}},
        timestamp: () => {return Date.now()},
        qualifiedFrom: SENDER_ID,
      } as unknown as Message;
    }

    it('stores a confirmation with the ids it confirms, and shows nothing', async () => {
      await startOutbox(parts);
      jest.spyOn(parts.conversation, 'is1to1').mockReturnValue(true);
      const more = {...receivedMessage(), id: 'received-2'} as Message;

      await parts.repository.sendConfirmationStatus(
        parts.conversation,
        receivedMessage(),
        Confirmation.Type.DELIVERED,
        [more],
      );

      expect(onlySnapshot(parts.store)).toEqual(
        expect.objectContaining({
          kind: 'receipt',
          state: 'queued',
          correlationKey: `receipt:${CONVERSATION_ID.id}:${Confirmation.Type.DELIVERED}:received-1`,
          orderingKey: `${CONVERSATION_ID.id}#receipts`,
          payload: {
            type: 'confirmation',
            conversationId: CONVERSATION_ID,
            confirmationType: Confirmation.Type.DELIVERED,
            messageIds: ['received-1', 'received-2'],
            recipient: SENDER_ID,
          },
        }),
      );
      expect(parts.inject).not.toHaveBeenCalled();
      expect(parts.send).not.toHaveBeenCalled();
    });

    it('still applies the filters before it queues a confirmation', async () => {
      await startOutbox(parts);
      jest.spyOn(parts.conversation, 'is1to1').mockReturnValue(false);

      await parts.repository.sendConfirmationStatus(parts.conversation, receivedMessage(), Confirmation.Type.DELIVERED);
      await parts.repository.sendConfirmationStatus(parts.conversation, {
        ...receivedMessage(),
        user: () => {return {isMe: true}},
      } as unknown as Message, Confirmation.Type.DELIVERED);

      expect(parts.store.operationIds()).toEqual([]);
    });

    it('queues the latest last read only, and still announces that the conversation was read', async () => {
      await startOutbox(parts);
      const removeRead = jest.fn();
      amplify.subscribe(WebAppEvents.NOTIFICATION.REMOVE_READ, removeRead);

      parts.conversation.last_read_timestamp(1000);
      await parts.repository.markAsRead(parts.conversation);
      parts.conversation.last_read_timestamp(2000);
      await parts.repository.markAsRead(parts.conversation);

      const snapshot = onlySnapshot(parts.store);
      expect(snapshot).toEqual(
        expect.objectContaining({
          kind: 'receipt',
          trigger: 'operation-versioned',
          correlationKey: `last-read:${CONVERSATION_ID.id}`,
          orderingKey: `${CONVERSATION_ID.id}#receipts`,
          payload: {type: 'last-read', conversationId: CONVERSATION_ID, timestamp: 2000},
        }),
      );
      expect(removeRead).toHaveBeenCalledTimes(2);
      expect(parts.inject).not.toHaveBeenCalled();
    });

    it('updates the cleared timestamp of the conversation and queues the cleared timestamp', async () => {
      await startOutbox(parts);
      jest.spyOn(parts.conversation, 'getLastKnownTimestamp').mockReturnValue(5000);

      await parts.repository.updateClearedTimestamp(parts.conversation);

      expect(parts.conversation.cleared_timestamp()).toBe(5000);
      expect(onlySnapshot(parts.store)).toEqual(
        expect.objectContaining({
          correlationKey: `cleared:${CONVERSATION_ID.id}`,
          orderingKey: `${CONVERSATION_ID.id}#receipts`,
          payload: {type: 'cleared', conversationId: CONVERSATION_ID, timestamp: 5000},
        }),
      );
    });

    it('queues nothing when there is nothing to clear', async () => {
      await startOutbox(parts);
      jest.spyOn(parts.conversation, 'getLastKnownTimestamp').mockReturnValue(0);

      await parts.repository.updateClearedTimestamp(parts.conversation);

      expect(parts.store.operationIds()).toEqual([]);
    });

    it('queues the tracking id sync in the lane of the self user', async () => {
      await startOutbox(parts);

      await parts.repository.sendCountlySync('countly-1');

      expect(onlySnapshot(parts.store)).toEqual(
        expect.objectContaining({
          correlationKey: 'data-transfer',
          orderingKey: 'self#receipts',
          payload: {type: 'data-transfer', countlyId: 'countly-1'},
        }),
      );
    });

    it.each([
      {
        name: 'not started',
        prepare: () => {
          return undefined;
        },
        start: false,
      },
      {
        name: 'failing to store',
        prepare: ({store}: Parts) => {
          store.fail('append', true);
        },
        start: true,
      },
      {
        name: 'full',
        prepare: ({store}: Parts) => {
          store.fill(true);
        },
        start: true,
      },
    ])('forgets a receipt the outbox refuses, without failing or showing anything, when it is $name', async options => {
      if (options.start) {
        await startOutbox(parts);
      }
      options.prepare(parts);

      await expect(parts.repository.sendCountlySync('countly-1')).resolves.toBeUndefined();
      await expect(parts.repository.markAsRead(parts.conversation)).resolves.toBeUndefined();

      expect(parts.inject).not.toHaveBeenCalled();
      expect(parts.updateEvent).not.toHaveBeenCalled();
      expect(parts.send).not.toHaveBeenCalled();
    });
  });

  describe('a sent message', () => {
    it('keeps the time it was written at when the send replaces its time with the server time', async () => {
      const written = '2026-01-01T00:00:00.000Z';
      const entity = {
        status: jest.fn(),
        written_time: ko.observable<string | undefined>(undefined),
        timestamp: ko.observable(new Date(written).getTime()),
        readReceipts: () => {return []},
        type: 'conversation.message-add',
        hasAssetImage: () => {return false},
        primary_key: 'primary-key',
      };
      jest.spyOn(parts.conversation, 'getMessage').mockReturnValue(entity as unknown as Message);
      jest.spyOn(parts.conversation, 'updateTimestamps').mockImplementation();
      jest.spyOn(parts.conversation, 'updateTimestampServer').mockImplementation();

      await (parts.repository as any).updateMessageAsSent(parts.conversation, 'message-1', '2026-01-01T00:00:05.000Z');

      expect(parts.updateEvent).toHaveBeenCalledWith(
        'primary-key',
        expect.objectContaining({time: '2026-01-01T00:00:05.000Z', written_time: written}),
      );
      expect(entity.written_time()).toBe(written);
    });

    it('does not replace a written time the record has', async () => {
      const entity = {
        status: jest.fn(),
        written_time: ko.observable<string | undefined>('2025-12-31T23:59:00.000Z'),
        timestamp: ko.observable(new Date('2026-01-01T00:00:00.000Z').getTime()),
        readReceipts: () => {return []},
        type: 'conversation.message-add',
        hasAssetImage: () => {return false},
        primary_key: 'primary-key',
      };
      jest.spyOn(parts.conversation, 'getMessage').mockReturnValue(entity as unknown as Message);
      jest.spyOn(parts.conversation, 'updateTimestamps').mockImplementation();
      jest.spyOn(parts.conversation, 'updateTimestampServer').mockImplementation();

      await (parts.repository as any).updateMessageAsSent(parts.conversation, 'message-1', '2026-01-01T00:00:05.000Z');

      expect(parts.updateEvent).toHaveBeenCalledWith(
        'primary-key',
        expect.objectContaining({written_time: '2025-12-31T23:59:00.000Z'}),
      );
    });
  });
});

describe('MessageRepository without an outbox keeps sending directly', () => {
  it('does not write a written time when a message is sent', async () => {
    const parts = buildParts();
    const repository = new MessageRepository(
      () => {
        return {checkMessageTimer: jest.fn()} as unknown as ConversationRepository;
      },
      new CryptographyRepository({} as any),
      new EventRepository(parts.eventService, {} as any, {} as any, {} as any),
      new PropertiesRepository({} as any, {} as any, translateForTest),
      serverTimeHandler,
      {} as UserRepository,
      {} as AssetRepository,
      new AudioRepository(),
      translateForTest,
      undefined,
      new UserState(),
      new ClientState(),
      new ConversationState(new UserState()),
      new TeamState(),
      createCoreTestFixture({service: {conversation: {send: jest.fn(), messageTimer: new MessageTimer()}}}),
    );
    const entity = {
      status: jest.fn(),
      written_time: ko.observable<string | undefined>(undefined),
      timestamp: ko.observable(1000),
      readReceipts: () => {return []},
      type: 'conversation.message-add',
      hasAssetImage: () => {return false},
      primary_key: 'primary-key',
    };
    jest.spyOn(parts.conversation, 'getMessage').mockReturnValue(entity as unknown as Message);
    jest.spyOn(parts.conversation, 'updateTimestamps').mockImplementation();
    jest.spyOn(parts.conversation, 'updateTimestampServer').mockImplementation();

    await (repository as any).updateMessageAsSent(parts.conversation, 'message-1', '2026-01-01T00:00:05.000Z');

    expect(parts.updateEvent.mock.calls[0][1]).not.toHaveProperty('written_time');
    parts.clock.dispose();
  });
});
