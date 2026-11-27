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
import {type Outbox, type OperationSnapshot} from '../../outbox';
import type {FakeClock} from '../../outbox/testing/createFakeClock';
import type {InMemoryOutboxStore} from '../../outbox/testing/createInMemoryOutboxStore';
import {createStoredSnapshot} from '../../outbox/testing/createOutboxTestKit';
import {serverTimeHandler} from '../../time/serverTimeHandler';
import {createCoreTestFixture} from '../../util/test/createCoreTestFixture';
import {translateForTest} from '../../util/test/translateForTest';
import {TIME_IN_MILLIS} from '../../util/timeUtil';
import {WebAppEvents} from '../../webAppEvents';
import {AssetRepository} from '../assets/assetRepository';
import {AudioRepository} from '../audio/audioRepository';
import {ClientState} from '../client/ClientState';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {Conversation} from '../entity/Conversation';
import {ContentMessage} from '../entity/message/contentMessage';
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
import {
  assetBytes,
  createOutboxRepository,
  sendingRecord,
  sentResult,
  uploadedAsset,
  WRITTEN_AT,
  type OutboxRepository,
  type StoredRecord,
} from './outbox/testing/createOutboxRepository';
import {assetPayload, textPayload} from './outbox/testing/payloadFactories';

const CONVERSATION_ID = {id: 'conversation-1', domain: 'wire.test'};
const MESSAGES_LANE = `${CONVERSATION_ID.id}@${CONVERSATION_ID.domain}`;
const SENDER_ID = {id: 'sender-1', domain: 'wire.test'};

type Parts = OutboxRepository & {
  store: InMemoryOutboxStore;
  clock: FakeClock;
  outbox: Outbox;
  /** What the repository did, in the order it did it: the store's appends, the injections and the record updates */
  order: string[];
};

function buildParts(maxOperations?: number): Parts {
  const parts = createOutboxRepository({maxOperations});
  const {store} = parts.kit;
  const order: string[] = [];
  const append = store.append.bind(store);
  jest.spyOn(store, 'append').mockImplementation(async snapshot => {
    order.push(`append:${snapshot.trigger}`);
    return append(snapshot);
  });
  const injectEvent = parts.injectEvent.getMockImplementation();
  parts.injectEvent.mockImplementation(async (...args: unknown[]) => {
    order.push('inject');
    return injectEvent?.(...args);
  });
  const updateEvent = parts.updateEvent.getMockImplementation();
  parts.updateEvent.mockImplementation(async (...args: unknown[]) => {
    order.push('updateEvent');
    return updateEvent?.(...args);
  });
  return {...parts, store, clock: parts.kit.clock, outbox: parts.kit.outbox, order};
}

/** Starts the outbox paused */
async function startOutbox({kit}: Parts): Promise<void> {
  await kit.start({run: false});
}

/** The latest snapshot of the only operation the store has */
function onlySnapshot(store: InMemoryOutboxStore): OperationSnapshot {
  const [id, ...others] = store.operationIds();
  expect(others).toEqual([]);
  return store.history(id).at(-1) as OperationSnapshot;
}

function messageIdOf(snapshot: OperationSnapshot): string {
  return (snapshot.payload as {messageId: string}).messageId;
}

/** The only record the event storage has */
function onlyRecord({records}: Parts): StoredRecord | undefined {
  const [record, ...others] = records.values();
  expect(others).toEqual([]);
  return record;
}

describe('MessageRepository routing sends through the outbox', () => {
  let parts: Parts;

  beforeEach(() => {
    parts = buildParts();
  });

  afterEach(() => {
    amplify.unsubscribeAll(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE);
    amplify.unsubscribeAll(WebAppEvents.NOTIFICATION.REMOVE_READ);
  });

  describe('a text message', () => {
    function sendText(options: {quote?: QuoteEntity} = {}): Promise<void> {
      return parts.repository.sendTextWithLinkPreview({
        conversation: parts.conversation,
        textMessage: 'hello',
        mentions: [],
        QuoteEntity: options.quote as never,
      });
    }

    function retryText(): Promise<void> {
      return parts.repository.retryTextMessage({
        conversation: parts.conversation,
        textMessage: 'hello',
        mentions: [],
        messageId: 'message-1',
      });
    }

    it('stores the operation, then shows the message, and sends nothing itself', async () => {
      await startOutbox(parts);

      await expect(sendText()).resolves.toBeUndefined();
      await parts.clock.settle();

      const snapshot = onlySnapshot(parts.store);
      expect(snapshot).toEqual(
        expect.objectContaining({
          kind: 'message',
          state: 'queued',
          lane: {state: 'in-lane', laneKey: MESSAGES_LANE},
          payload: expect.objectContaining({
            type: 'text',
            text: 'hello',
            mentions: [],
            conversationId: CONVERSATION_ID,
          }),
        }),
      );
      expect(snapshot.correlation).toEqual({state: 'correlated', correlationKey: messageIdOf(snapshot)});
      expect(parts.order).toEqual(['append:operation-queued', 'inject']);
      expect(parts.send).not.toHaveBeenCalled();
    });

    it('keeps only the ids of a quote, and shows the message with it', async () => {
      await startOutbox(parts);
      const quote = new QuoteEntity({hash: new Uint8Array([1]).buffer, messageId: 'quoted-1', userId: 'quoted-user'});

      await sendText({quote});
      await parts.clock.settle();

      expect(onlySnapshot(parts.store).payload).toEqual(
        expect.objectContaining({quote: {messageId: 'quoted-1', userId: 'quoted-user'}}),
      );
      expect(parts.injectEvent).toHaveBeenCalledTimes(1);
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

      expect(parts.injectEvent).toHaveBeenCalledTimes(1);
      expect(onlyRecord(parts)).toMatchObject({status: StatusType.FAILED, failed_reason: 'rejected'});
      expect(parts.send).not.toHaveBeenCalled();
    });

    it('shows the message as failed when the outbox is full', async () => {
      parts = buildParts(0);
      await startOutbox(parts);

      await sendText();

      expect(parts.injectEvent).toHaveBeenCalledTimes(1);
      expect(onlyRecord(parts)).toMatchObject({status: StatusType.FAILED, failed_reason: 'rejected'});
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
            trigger: 'attempt-dead-lettered',
            correlation: {state: 'correlated', correlationKey: 'message-1'},
            lane: {state: 'in-lane', laneKey: MESSAGES_LANE},
            payload,
            state: 'dead-lettered',
            attempts,
            queuedSeq: 7,
            queuedAt: 1_000_000 - 5000,
            expiry: {state: 'expires-at', serverTime: 1_000_000 - 1},
          }),
        );
      }

      function storeFailedMessage(): void {
        parts.records.set('message-1', sendingRecord({status: StatusType.FAILED, failed_reason: 'declined'}));
      }

      async function startWithFailedMessage(): Promise<void> {
        storeFailedMessage();
        await startOutbox(parts);
        parts.updateEvent.mockClear();
        parts.order.length = 0;
      }

      it('queues the dead-lettered operation again as a version of itself, marked as maybe delivered', async () => {
        seedDeadLetter(2);
        await startWithFailedMessage();
        await parts.clock.advance(60_000);

        await retryText();

        const snapshot = onlySnapshot(parts.store);
        expect(snapshot).toEqual(
          expect.objectContaining({
            id: 'operation-1',
            trigger: 'operation-versioned',
            state: 'queued',
            attempts: 0,
            queuedSeq: 7,
            expiry: {state: 'expires-at', serverTime: parts.clock.getServerTime() + TIME_IN_MILLIS.WEEK},
            payload: {...failedPayload, mayBeDelivered: true},
          }),
        );
      });

      it('does not mark an operation that never went out as maybe delivered', async () => {
        seedDeadLetter(0);
        await startWithFailedMessage();

        await retryText();

        expect(onlySnapshot(parts.store).payload).toEqual(failedPayload);
      });

      it('keeps a mark an earlier retry left', async () => {
        seedDeadLetter(0, {...failedPayload, mayBeDelivered: true});
        await startWithFailedMessage();

        await retryText();

        expect(onlySnapshot(parts.store).payload).toEqual({...failedPayload, mayBeDelivered: true});
      });

      it('clears the decline and the failed status on the record before it queues, and shows the message as sending', async () => {
        seedDeadLetter(1);
        await startWithFailedMessage();

        await retryText();

        expect(parts.updateEvent).toHaveBeenCalledWith('message-1', {
          status: StatusType.SENDING,
          failed_reason: undefined,
        });
        expect(parts.records.get('message-1')).toMatchObject({status: StatusType.SENDING, failed_reason: undefined});
        expect(parts.order.slice(0, 2)).toEqual(['updateEvent', 'append:operation-versioned']);
        expect(parts.injectEvent).not.toHaveBeenCalled();
      });

      it('queues a new operation under the same id when the outbox does not know the message', async () => {
        parts.records.set('message-1', sendingRecord());
        await startOutbox(parts);

        await retryText();

        expect(onlySnapshot(parts.store)).toEqual(
          expect.objectContaining({
            trigger: 'operation-queued',
            correlation: {state: 'correlated', correlationKey: 'message-1'},
            attempts: 0,
            payload: expect.objectContaining({messageId: 'message-1', text: 'hello'}),
          }),
        );
        expect(parts.injectEvent).not.toHaveBeenCalled();
      });

      it('shows the message as failed again when the outbox refuses it', async () => {
        storeFailedMessage();
        await startOutbox(parts);
        parts.store.fail('append', true);

        await retryText();

        expect(parts.updateEvent).toHaveBeenLastCalledWith('message-1', {
          status: StatusType.FAILED,
          failed_reason: 'rejected',
        });
      });
    });
  });

  describe('an asset', () => {
    const file = new File(['bytes'], 'notes.txt', {type: 'text/plain'});

    /** Resolves once the repository is done with the file */
    async function sendAsset(asset: Blob = file): Promise<void> {
      parts.repository.uploadFiles(parts.conversation, [asset], false);
      await parts.clock.settle();
      await parts.clock.settle();
    }

    it('stores the operation with ids only, shows the pending asset, then keeps the bytes on the record', async () => {
      await startOutbox(parts);

      await sendAsset();

      const snapshot = onlySnapshot(parts.store);
      expect(snapshot).toEqual(
        expect.objectContaining({
          kind: 'message',
          state: 'queued',
          lane: {state: 'in-lane', laneKey: MESSAGES_LANE},
          limits: {attemptTimeout: {state: 'times-out-after', milliseconds: 10 * 60 * 1000}},
          payload: {type: 'asset', conversationId: CONVERSATION_ID, messageId: expect.any(String), asImage: false},
        }),
      );
      expect(snapshot.correlation).toEqual({state: 'correlated', correlationKey: messageIdOf(snapshot)});
      expect(parts.order).toEqual(['append:operation-queued', 'inject', 'updateEvent']);
      expect(parts.records.get(messageIdOf(snapshot))?.fileData).toBe(file);
      expect(parts.send).not.toHaveBeenCalled();
    });

    it('shows the asset as failed with its bytes kept when the outbox refuses it', async () => {
      await sendAsset();

      expect(parts.injectEvent).toHaveBeenCalledTimes(1);
      expect(onlyRecord(parts)).toMatchObject({fileData: file, status: StatusType.FAILED, failed_reason: 'rejected'});
      expect(parts.send).not.toHaveBeenCalled();
    });

    it('shows the asset as failed, with the bytes on the shown message, when the record cannot take them', async () => {
      await startOutbox(parts);
      const shown = new Map<string, ContentMessage>();
      jest.spyOn(parts.conversation, 'getMessage').mockImplementation(messageId => {
        const message =
          shown.get(messageId) ??
          Object.assign(new ContentMessage(messageId, translateForTest), {primary_key: messageId});
        shown.set(messageId, message);
        return message;
      });
      const updateEvent = parts.updateEvent.getMockImplementation();
      parts.updateEvent.mockImplementation(async (primaryKey: string, changes: StoredRecord) => {
        if (changes.fileData !== undefined) {
          throw new Error('QuotaExceededError');
        }
        return updateEvent?.(primaryKey, changes);
      });

      await expect(sendAsset()).resolves.toBeUndefined();

      expect(parts.injectEvent).toHaveBeenCalledTimes(1);
      const [message] = shown.values();
      expect(message.fileData()).toBe(file);
      expect(parts.updateEvent).toHaveBeenCalledWith(message.id, {
        status: StatusType.FAILED,
        failed_reason: 'rejected',
      });

      // Being queued shows it as sending again, and its attempt, which has no bytes to upload, fails it for good.
      parts.outbox.resume();
      await parts.clock.settle();

      expect(onlyRecord(parts)).toMatchObject({status: StatusType.FAILED, failed_reason: 'rejected'});
      expect(onlyRecord(parts)?.fileData).toBeUndefined();
      expect(parts.send).not.toHaveBeenCalled();
    });

    it('shows nothing when the metadata of the file cannot be built', async () => {
      await startOutbox(parts);

      // jsdom has no audio context to read the duration of an audio file with
      await sendAsset(new File(['bytes'], 'song.mp3', {type: 'audio/mpeg'}));

      expect(parts.store.operationIds()).toEqual([]);
      expect(parts.injectEvent).not.toHaveBeenCalled();
    });

    describe('Retry', () => {
      const failedPayload = {
        type: 'asset' as const,
        conversationId: CONVERSATION_ID,
        messageId: 'asset-1',
        asImage: false,
      };

      function seedDeadLetter(attempts: number): void {
        parts.store.seed(
          createStoredSnapshot({
            kind: 'message',
            id: 'operation-1',
            seq: 3,
            trigger: 'attempt-dead-lettered',
            correlation: {state: 'correlated', correlationKey: 'asset-1'},
            lane: {state: 'in-lane', laneKey: MESSAGES_LANE},
            payload: failedPayload,
            state: 'dead-lettered',
            attempts,
            queuedSeq: 7,
            queuedAt: 1_000_000 - 5000,
            expiry: {state: 'expires-at', serverTime: 1_000_000 - 1},
          }),
        );
      }

      function retry(): Promise<void> {
        return parts.repository.retryUploadFile(parts.conversation, file, false, 'asset-1') as Promise<void>;
      }

      it('queues the dead-lettered operation again as a version of itself, from the bytes on the record', async () => {
        seedDeadLetter(2);
        parts.records.set('asset-1', sendingRecord({status: StatusType.FAILED, fileData: file}));
        await startOutbox(parts);
        parts.updateEvent.mockClear();
        parts.order.length = 0;

        await retry();

        expect(onlySnapshot(parts.store)).toEqual(
          expect.objectContaining({
            id: 'operation-1',
            trigger: 'operation-versioned',
            state: 'queued',
            attempts: 0,
            queuedSeq: 7,
            payload: {...failedPayload, mayBeDelivered: true},
          }),
        );
        expect(parts.order.slice(0, 2)).toEqual(['updateEvent', 'append:operation-versioned']);
        expect(parts.updateEvent).not.toHaveBeenCalledWith('asset-1', {fileData: file});
        expect(parts.injectEvent).not.toHaveBeenCalled();
      });

      it('puts the bytes back on a record that lost them, and queues a new operation', async () => {
        parts.records.set('asset-1', sendingRecord({status: StatusType.FAILED}));
        await startOutbox(parts);

        await retry();

        expect(parts.records.get('asset-1')?.fileData).toBe(file);
        expect(onlySnapshot(parts.store)).toEqual(
          expect.objectContaining({trigger: 'operation-queued', payload: failedPayload}),
        );
        expect(parts.injectEvent).not.toHaveBeenCalled();
      });

      it('shows the asset as failed again when the outbox refuses it', async () => {
        parts.records.set('asset-1', sendingRecord({status: StatusType.FAILED, fileData: file}));
        await startOutbox(parts);
        parts.store.fail('append', true);

        await retry();

        expect(parts.updateEvent).toHaveBeenLastCalledWith('asset-1', {
          status: StatusType.FAILED,
          failed_reason: 'rejected',
        });
      });
    });

    describe('the upload', () => {
      function beforeUnloadListeners(spy: jest.SpyInstance): unknown[] {
        return spy.mock.calls
          .filter(([type]) => {
            return type === 'beforeunload';
          })
          .map(([, listener]) => {
            return listener;
          });
      }

      it('warns about leaving only while it runs, and keeps the result on the record', async () => {
        parts.records.set('asset-1', sendingRecord({fileData: assetBytes()}));
        const events: string[] = [];
        const add = jest.spyOn(window, 'addEventListener').mockImplementation(type => {
          events.push(`add:${type}`);
        });
        const remove = jest.spyOn(window, 'removeEventListener').mockImplementation(type => {
          events.push(`remove:${type}`);
        });
        parts.uploadFile.mockImplementation(async () => {
          events.push('upload');
          return uploadedAsset();
        });

        await parts.attempt('message', assetPayload());

        add.mockRestore();
        remove.mockRestore();
        expect(events).toEqual(['add:beforeunload', 'upload', 'remove:beforeunload']);
        const {domain, key, keyBytes, sha256, token} = uploadedAsset();
        expect(parts.updateEvent).toHaveBeenCalledWith('asset-1', {
          data: {content: 'hello', mentions: [], previews: [], domain, key, otr_key: keyBytes, sha256, token},
        });
      });

      it('lets go of the warning when the upload fails', async () => {
        parts.records.set('asset-1', sendingRecord({fileData: assetBytes()}));
        const add = jest.spyOn(window, 'addEventListener');
        const remove = jest.spyOn(window, 'removeEventListener');
        parts.uploadFile.mockRejectedValue(new Error('offline'));

        await parts.attempt('message', assetPayload());

        const added = beforeUnloadListeners(add);
        const removed = beforeUnloadListeners(remove);
        add.mockRestore();
        remove.mockRestore();
        expect(added).toHaveLength(1);
        expect(removed).toEqual(added);
        expect(parts.send).not.toHaveBeenCalled();
      });
    });
  });

  describe('a ping', () => {
    it('stores the operation, plays the sound, shows the ping, and answers that it is queued', async () => {
      await startOutbox(parts);

      const result = await parts.repository.sendPing(parts.conversation);
      await parts.clock.settle();

      const snapshot = onlySnapshot(parts.store);
      expect(snapshot).toEqual(
        expect.objectContaining({
          kind: 'ping',
          state: 'queued',
          lane: {state: 'in-lane', laneKey: MESSAGES_LANE},
          correlation: {state: 'correlated', correlationKey: result.id},
          expiry: {state: 'expires-at', serverTime: parts.clock.getServerTime() + 60_000},
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
      expect(parts.injectEvent).toHaveBeenCalledTimes(1);
      expect(parts.records.get(result.id)).toMatchObject({status: StatusType.FAILED, failed_reason: 'rejected'});
    });

    it('goes behind the messages of the conversation in the same lane', async () => {
      await startOutbox(parts);

      await parts.repository.sendTextWithLinkPreview({
        conversation: parts.conversation,
        textMessage: 'first',
        mentions: [],
      });
      await parts.repository.sendPing(parts.conversation);

      const laneResult = parts.outbox.lane(MESSAGES_LANE);
      expect(laneResult).toEqual(expect.objectContaining({outcome: 'lane-found'}));
      expect((laneResult as {lane: {operations: unknown[]}}).lane.operations).toHaveLength(2);
    });
  });

  describe('the HTTP attempts of a send', () => {
    it.each([
      [
        'a text message',
        () => {
          return parts.repository.sendTextWithLinkPreview({
            conversation: parts.conversation,
            textMessage: 'hello',
            mentions: [],
          });
        },
      ],
      [
        'a ping',
        () => {
          return parts.repository.sendPing(parts.conversation);
        },
      ],
    ])('is a single one for %s sent by the outbox', async (_name, send) => {
      await startOutbox(parts);
      parts.outbox.resume();
      await parts.clock.settle();

      await send();
      await parts.clock.advance(1_000);

      expect(parts.send).toHaveBeenCalledTimes(1);
      expect(parts.send).toHaveBeenCalledWith(expect.objectContaining({failFast: true}));
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
      const injectEvent = parts.injectEvent.getMockImplementation();
      parts.injectEvent.mockImplementation(async (event: {id: string}) => {
        await released;
        if (fail === true) {
          throw new Error('injection failed');
        }
        shown.add(event.id);
        return injectEvent?.(event);
      });
    }

    beforeEach(() => {
      shown = new Set();
      shownWhenSent = [];
      sendAttempts = 0;
      parts.send.mockImplementation(async ({payload}: {payload: {messageId: string}}) => {
        sendAttempts += 1;
        shownWhenSent.push(shown.has(payload.messageId));
        return sentResult();
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

      await sendText();
      await parts.clock.advance(1_000);
      expect(sendAttempts).toBe(0);

      release();
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
          correlation: {state: 'correlated', correlationKey: 'message-1'},
          lane: {state: 'in-lane', laneKey: MESSAGES_LANE},
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
          expiry: {state: 'expires-at', serverTime: 1_000_000 + TIME_IN_MILLIS.WEEK},
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
        user: () => {
          return {isMe: false};
        },
        timestamp: () => {
          return Date.now();
        },
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
          correlation: {
            state: 'correlated',
            correlationKey: `receipt:${CONVERSATION_ID.id}:${Confirmation.Type.DELIVERED}:received-1`,
          },
          lane: {state: 'in-lane', laneKey: `${CONVERSATION_ID.id}@${CONVERSATION_ID.domain}#receipts`},
          payload: {
            type: 'confirmation',
            conversationId: CONVERSATION_ID,
            confirmationType: Confirmation.Type.DELIVERED,
            messageIds: ['received-1', 'received-2'],
            recipient: SENDER_ID,
          },
        }),
      );
      expect(parts.injectEvent).not.toHaveBeenCalled();
      expect(parts.send).not.toHaveBeenCalled();
    });

    it('still applies the filters before it queues a confirmation', async () => {
      await startOutbox(parts);
      jest.spyOn(parts.conversation, 'is1to1').mockReturnValue(false);

      await parts.repository.sendConfirmationStatus(parts.conversation, receivedMessage(), Confirmation.Type.DELIVERED);
      await parts.repository.sendConfirmationStatus(
        parts.conversation,
        {
          ...receivedMessage(),
          user: () => {
            return {isMe: true};
          },
        } as unknown as Message,
        Confirmation.Type.DELIVERED,
      );

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
          correlation: {state: 'correlated', correlationKey: `last-read:${CONVERSATION_ID.id}`},
          lane: {state: 'in-lane', laneKey: `${CONVERSATION_ID.id}@${CONVERSATION_ID.domain}#receipts`},
          payload: {type: 'last-read', conversationId: CONVERSATION_ID, timestamp: 2000},
        }),
      );
      expect(removeRead).toHaveBeenCalledTimes(2);
      expect(parts.injectEvent).not.toHaveBeenCalled();
    });

    it('updates the cleared timestamp of the conversation and queues the cleared timestamp', async () => {
      await startOutbox(parts);
      jest.spyOn(parts.conversation, 'getLastKnownTimestamp').mockReturnValue(5000);

      await parts.repository.updateClearedTimestamp(parts.conversation);

      expect(parts.conversation.cleared_timestamp()).toBe(5000);
      expect(onlySnapshot(parts.store)).toEqual(
        expect.objectContaining({
          correlation: {state: 'correlated', correlationKey: `cleared:${CONVERSATION_ID.id}`},
          lane: {state: 'in-lane', laneKey: `${CONVERSATION_ID.id}@${CONVERSATION_ID.domain}#receipts`},
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
          correlation: {state: 'correlated', correlationKey: 'data-transfer'},
          lane: {state: 'in-lane', laneKey: 'self#receipts'},
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

      expect(parts.injectEvent).not.toHaveBeenCalled();
      expect(parts.updateEvent).not.toHaveBeenCalled();
      expect(parts.send).not.toHaveBeenCalled();
    });
  });

  describe('a sent message', () => {
    const SENT_LATER = '2026-01-01T00:00:05.000Z';

    beforeEach(() => {
      parts.send.mockResolvedValue(sentResult('message-1', SENT_LATER));
    });

    it('keeps the time it was written at when the send replaces its time with the server time', async () => {
      parts.records.set('message-1', sendingRecord({time: WRITTEN_AT}));

      await parts.attempt('message', textPayload());

      expect(parts.records.get('message-1')).toMatchObject({time: SENT_LATER, written_time: WRITTEN_AT});
    });

    it('does not replace a written time the record has', async () => {
      const writtenEarlier = '2025-12-31T23:00:00.000Z';
      parts.records.set('message-1', sendingRecord({time: WRITTEN_AT, written_time: writtenEarlier}));

      await parts.attempt('message', textPayload());

      expect(parts.records.get('message-1')).toMatchObject({time: SENT_LATER, written_time: writtenEarlier});
    });
  });
});

describe('MessageRepository without an outbox keeps sending directly', () => {
  function buildRepository(assetRepository = {} as AssetRepository): {
    repository: MessageRepository;
    conversation: Conversation;
    updateEvent: jest.SpyInstance;
    send: jest.Mock;
  } {
    const selfUser = new User('selfid', '', translateForTest);
    selfUser.isMe = true;
    const userState = new UserState();
    userState.self(selfUser);
    const conversation = new Conversation(
      CONVERSATION_ID.id,
      CONVERSATION_ID.domain,
      CONVERSATION_PROTOCOL.PROTEUS,
      translateForTest,
    );
    const eventService = new EventService({} as any);
    jest.spyOn(eventService, 'loadEvent').mockResolvedValue(undefined);
    const updateEvent = jest.spyOn(eventService, 'updateEvent').mockResolvedValue({} as any);
    const audioRepository = new AudioRepository();
    jest.spyOn(audioRepository, 'play').mockResolvedValue(undefined as never);
    const send = jest.fn().mockResolvedValue(sentResult());
    const repository = new MessageRepository(
      () => {
        return {checkMessageTimer: jest.fn()} as unknown as ConversationRepository;
      },
      new CryptographyRepository({} as any),
      new EventRepository(eventService, {} as any, {} as any, {} as any),
      new PropertiesRepository({} as any, {} as any, translateForTest),
      serverTimeHandler,
      {} as UserRepository,
      assetRepository,
      audioRepository,
      translateForTest,
      undefined,
      userState,
      new ClientState(),
      new ConversationState(userState),
      new TeamState(),
      createCoreTestFixture({service: {conversation: {send, messageTimer: new MessageTimer()}}}),
    );
    return {repository, conversation, updateEvent, send};
  }

  it('does not write a written time when a message is sent', async () => {
    const {repository, conversation, updateEvent} = buildRepository();
    const entity = {
      status: jest.fn(),
      written_time: ko.observable<string | undefined>(undefined),
      timestamp: ko.observable(1000),
      readReceipts: () => {
        return [];
      },
      type: 'conversation.message-add',
      hasAssetImage: () => {
        return false;
      },
      primary_key: 'primary-key',
    };
    jest.spyOn(conversation, 'getMessage').mockReturnValue(entity as unknown as Message);
    jest.spyOn(conversation, 'updateTimestamps').mockImplementation();
    jest.spyOn(conversation, 'updateTimestampServer').mockImplementation();

    await repository.sendPing(conversation);

    expect(updateEvent).toHaveBeenCalledTimes(1);
    expect(updateEvent.mock.calls[0][1]).not.toHaveProperty('written_time');
  });

  it('uploads a file as before, holding the page open for the whole send and showing the process queue', async () => {
    const uploadFile = jest.fn().mockImplementation(async () => {
      return uploadedAsset();
    });
    const assetRepository = {
      addToProcessQueue: jest.fn(),
      getAssetRetention: jest.fn(),
      uploadFile,
    } as unknown as AssetRepository;
    const {repository, conversation, send} = buildRepository(assetRepository);
    const sent = new Promise<void>(resolve => {
      send.mockImplementation(async () => {
        resolve();
        return sentResult();
      });
    });
    const add = jest.spyOn(window, 'addEventListener');

    repository.uploadFiles(conversation, [assetBytes()], false);
    await sent;

    const listeners = add.mock.calls.filter(([type]) => {
      return type === 'beforeunload';
    });
    add.mockRestore();
    expect(listeners).toHaveLength(1);
    expect(assetRepository.addToProcessQueue).toHaveBeenCalledTimes(1);
    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
