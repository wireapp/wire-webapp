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

import {GenericMessage} from '@wireapp/protocol-messaging';

import {CONVERSATION_PROTOCOL} from '../../apiClient/team/feature/featureList.types';
import {MessageSendingState} from '../../core/conversation';
import {MessageTimer} from '../../core/conversation/messageTimer/messageTimer';
import {StatusType} from '../../message/statusType';
import {type OperationSnapshot, type Outbox} from '../../outbox';
import type {FakeClock} from '../../outbox/testing/createFakeClock';
import type {InMemoryOutboxStore} from '../../outbox/testing/createInMemoryOutboxStore';
import {createStoredSnapshot} from '../../outbox/testing/createOutboxTestKit';
import {translateForTest} from '../../util/test/translateForTest';
import {TIME_IN_MILLIS} from '../../util/timeUtil';
import {WebAppEvents} from '../../webAppEvents';
import {ContentMessage} from '../entity/message/contentMessage';
import {Text as TextAsset} from '../entity/message/text';
import {StorageKey} from '../storage';

import {
  createOutboxRepository,
  sendingRecord,
  sentResult,
  type OutboxRepository,
} from './outbox/testing/createOutboxRepository';

const CONVERSATION_ID = {id: 'conversation-1', domain: 'wire.test'};
const MESSAGES_LANE = `${CONVERSATION_ID.id}@${CONVERSATION_ID.domain}`;
const CHANGES_LANE = `${MESSAGES_LANE}#changes`;

type Parts = OutboxRepository & {store: InMemoryOutboxStore; clock: FakeClock; outbox: Outbox};

function buildParts(): Parts {
  const parts = createOutboxRepository();
  return {...parts, store: parts.kit.store, clock: parts.kit.clock, outbox: parts.kit.outbox};
}

/** Starts the outbox paused */
async function startOutbox({kit}: Parts): Promise<void> {
  await kit.start({run: false});
}

/** The latest snapshot of the operation with this correlation key, if the store has one */
function snapshotOf(store: InMemoryOutboxStore, correlationKey: string): OperationSnapshot | undefined {
  return store
    .operationIds()
    .map(id => {
      return store.history(id).at(-1) as OperationSnapshot;
    })
    .find(snapshot => {
      return snapshot.correlation.state === 'correlated' && snapshot.correlation.correlationKey === correlationKey;
    });
}

function seedMessage(
  parts: Parts,
  overrides: Partial<OperationSnapshot> & {messageId?: string; mayBeDelivered?: true} = {},
): string {
  const {messageId = 'message-1', mayBeDelivered, ...snapshot} = overrides;
  parts.records.set(messageId, sendingRecord({data: {content: 'old', mentions: [], previews: []}}));
  parts.store.seed(
    createStoredSnapshot({
      kind: 'message',
      id: `operation-${messageId}`,
      correlation: {state: 'correlated', correlationKey: messageId},
      lane: {state: 'in-lane', laneKey: MESSAGES_LANE},
      payload: {
        type: 'text',
        conversationId: CONVERSATION_ID,
        messageId,
        text: 'old',
        mentions: [],
        mayBeDelivered,
      },
      expiry: {state: 'expires-at', serverTime: 1_000_000 + TIME_IN_MILLIS.WEEK},
      ...snapshot,
    }),
  );
  return messageId;
}

/** A message the user wrote, as it is shown and stored */
function createMessage(parts: Parts, id: string, text = 'old', status = StatusType.SENDING): ContentMessage {
  parts.records.set(id, sendingRecord({status, data: {content: text, mentions: [], previews: []}}));
  const message = new ContentMessage(id, translateForTest);
  message.user(parts.selfUser);
  message.status(status);
  message.assets.push(new TextAsset(id, text));
  Object.assign(message, {primary_key: id});
  return message;
}

describe('MessageRepository routes changes through the outbox', () => {
  let parts: Parts;

  beforeEach(() => {
    parts = buildParts();
  });

  afterEach(() => {
    amplify.unsubscribeAll(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE);
    amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MESSAGE.EDIT);
  });

  describe('a reaction', () => {
    function react(message: ContentMessage, reaction: string): Promise<unknown> | null {
      return parts.repository.toggleReaction(parts.conversation, message, reaction, {id: 'selfid', domain: ''});
    }

    it('waits behind its pending message in the lane of messages, and shows at once', async () => {
      seedMessage(parts);
      await startOutbox(parts);
      const message = createMessage(parts, 'message-1');

      await expect(react(message, '❤️')).resolves.toEqual(expect.objectContaining({state: 'QUEUED'}));

      expect(snapshotOf(parts.store, 'message-1:reaction')).toEqual(
        expect.objectContaining({
          kind: 'message',
          state: 'queued',
          lane: {state: 'in-lane', laneKey: MESSAGES_LANE},
          payload: {
            type: 'reaction',
            conversationId: CONVERSATION_ID,
            targetMessageId: 'message-1',
            reactions: '❤️',
          },
        }),
      );
      expect(parts.injectEvent).toHaveBeenCalledTimes(1);
      expect(parts.send).not.toHaveBeenCalled();
    });

    it('is a version of itself when toggled again', async () => {
      seedMessage(parts);
      await startOutbox(parts);
      const message = createMessage(parts, 'message-1');

      await react(message, '❤️');
      message.reactions([['❤️', [{id: 'selfid', domain: ''}]]]);
      await react(message, '❤️');

      const snapshot = snapshotOf(parts.store, 'message-1:reaction');
      expect(snapshot).toEqual(
        expect.objectContaining({trigger: 'operation-versioned', payload: expect.objectContaining({reactions: ''})}),
      );
      expect(
        parts.store.operationIds().filter(id => {
          const correlation = parts.store.history(id).at(-1)?.correlation;
          return correlation?.state === 'correlated' && correlation.correlationKey === 'message-1:reaction';
        }),
      ).toHaveLength(1);
    });

    it('to a message that was sent goes to the lane of changes, which a held message does not block', async () => {
      seedMessage(parts, {messageId: 'pending-1', state: 'on-hold'});
      await startOutbox(parts);
      const sent = createMessage(parts, 'sent-1', 'text', StatusType.SENT);

      await react(sent, '👍');
      parts.outbox.resume();
      await parts.clock.settle();

      expect(snapshotOf(parts.store, 'sent-1:reaction')).toBeUndefined();
      expect(parts.send).toHaveBeenCalledTimes(1);
      expect(snapshotOf(parts.store, 'pending-1')?.state).toBe('on-hold');
    });

    it('is stored in the lane of changes when its message is not in the outbox', async () => {
      await startOutbox(parts);
      const sent = createMessage(parts, 'sent-1', 'text', StatusType.SENT);

      await react(sent, '👍');

      expect(snapshotOf(parts.store, 'sent-1:reaction')).toEqual(
        expect.objectContaining({
          kind: 'message-change',
          lane: {state: 'in-lane', laneKey: CHANGES_LANE},
          state: 'queued',
        }),
      );
    });

    it('in the lane of changes keeps the reactions from before the first unsent version', async () => {
      await startOutbox(parts);
      const sent = createMessage(parts, 'sent-1', 'text', StatusType.SENT);
      sent.reactions([['👍', [{id: 'selfid', domain: ''}]]]);

      await react(sent, '❤️');
      sent.reactions([
        ['👍', [{id: 'selfid', domain: ''}]],
        ['❤️', [{id: 'selfid', domain: ''}]],
      ]);
      await react(sent, '👍');

      expect(snapshotOf(parts.store, 'sent-1:reaction')).toEqual(
        expect.objectContaining({payload: expect.objectContaining({reactions: '❤️', previousReactions: '👍'})}),
      );
    });

    it('expires after a minute in the lane of changes, and keeps the long expiry behind its pending message', async () => {
      seedMessage(parts, {messageId: 'pending-1', state: 'on-hold'});
      await startOutbox(parts);

      await react(createMessage(parts, 'pending-1'), '❤️');
      await react(createMessage(parts, 'sent-1', 'text', StatusType.SENT), '👍');

      expect(snapshotOf(parts.store, 'pending-1:reaction')).toEqual(
        expect.objectContaining({expiry: {state: 'expires-at', serverTime: 1_000_000 + TIME_IN_MILLIS.WEEK}}),
      );
      expect(snapshotOf(parts.store, 'sent-1:reaction')).toEqual(
        expect.objectContaining({expiry: {state: 'expires-at', serverTime: 1_000_000 + TIME_IN_MILLIS.MINUTE}}),
      );
    });

    it('keeps following its message once that went out, while its own reaction is still waiting', async () => {
      seedMessage(parts, {messageId: 'message-1'});
      parts.store.seed(
        createStoredSnapshot({
          kind: 'message',
          id: 'operation-reaction',
          correlation: {state: 'correlated', correlationKey: 'message-1:reaction'},
          lane: {state: 'in-lane', laneKey: MESSAGES_LANE},
          payload: {
            type: 'reaction',
            conversationId: CONVERSATION_ID,
            targetMessageId: 'message-1',
            reactions: '👍',
          },
          queuedSeq: 2,
          trigger: 'operation-held',
          state: 'on-hold',
          expiry: {state: 'expires-at', serverTime: 1_000_000 + TIME_IN_MILLIS.WEEK},
        }),
      );
      await startOutbox(parts);
      // The message itself is gone from the outbox once it went out, but its held reaction is not
      parts.outbox.resume();
      await parts.clock.settle();
      expect(parts.outbox.findByCorrelationKey('message-1').outcome).toBe('operation-not-found');
      parts.outbox.pause();

      await parts.repository.toggleReaction(
        parts.conversation,
        createMessage(parts, 'message-1', 'old', StatusType.SENT),
        '❤️',
        {id: 'selfid', domain: ''},
      );

      expect(snapshotOf(parts.store, 'message-1:reaction')).toEqual(
        expect.objectContaining({kind: 'message', trigger: 'operation-versioned'}),
      );
    });
  });

  describe('editing', () => {
    it('holds the message when the user starts editing it, and releases it when another one is edited', async () => {
      seedMessage(parts, {messageId: 'message-1'});
      seedMessage(parts, {messageId: 'message-2', queuedSeq: 2});
      await startOutbox(parts);

      void parts.repository.startEditing(createMessage(parts, 'message-1'));
      await parts.clock.settle();
      expect(snapshotOf(parts.store, 'message-1')?.state).toBe('on-hold');

      void parts.repository.startEditing(createMessage(parts, 'message-2'));
      await parts.clock.settle();
      expect(snapshotOf(parts.store, 'message-1')?.state).toBe('queued');
      expect(snapshotOf(parts.store, 'message-2')?.state).toBe('on-hold');
    });

    it('changes a message that was never attempted in place, as a version of it', async () => {
      seedMessage(parts, {messageId: 'message-1'});
      await startOutbox(parts);
      const message = createMessage(parts, 'message-1');
      void parts.repository.startEditing(message);
      await parts.clock.settle();

      await parts.repository.sendMessageEdit(parts.conversation, 'new', message, []);

      expect(snapshotOf(parts.store, 'message-1')).toEqual(
        expect.objectContaining({
          kind: 'message',
          trigger: 'operation-versioned',
          state: 'queued',
          payload: expect.objectContaining({type: 'text', messageId: 'message-1', text: 'new'}),
        }),
      );
      expect(snapshotOf(parts.store, 'message-1:edit')).toBeUndefined();
      expect(parts.records.get('message-1')?.data).toMatchObject({content: 'new', mentions: []});
      const [shown] = message.assets() as TextAsset[];
      expect(shown.text).toBe('new');
      expect(message.id).toBe('message-1');
      expect(message.was_edited()).toBe(false);
      expect(parts.injectEvent).not.toHaveBeenCalled();
      expect(parts.simpleStorage.get(StorageKey.OUTBOX.EDITED_MESSAGES)).toEqual({});
    });

    it('works on a hold restored from an earlier session, which this session never registered', async () => {
      seedMessage(parts, {messageId: 'message-1', state: 'on-hold', attempts: 0});
      await startOutbox(parts);
      const message = createMessage(parts, 'message-1');

      await parts.repository.sendMessageEdit(parts.conversation, 'new', message, []);

      expect(snapshotOf(parts.store, 'message-1')).toEqual(
        expect.objectContaining({state: 'queued', payload: expect.objectContaining({text: 'new'})}),
      );
    });

    it('adopts a restored hold the draft still edits, so that editing another message releases it', async () => {
      seedMessage(parts, {messageId: 'message-1', state: 'on-hold'});
      seedMessage(parts, {messageId: 'message-2', queuedSeq: 2});
      parts.simpleStorage.set(StorageKey.OUTBOX.EDITED_MESSAGES, {[CONVERSATION_ID.id]: 'message-1'});
      await startOutbox(parts);

      parts.repository.reviewRestoredHolds();
      await parts.clock.settle();
      expect(snapshotOf(parts.store, 'message-1')?.state).toBe('on-hold');

      void parts.repository.startEditing(createMessage(parts, 'message-2'));
      await parts.clock.settle();

      expect(snapshotOf(parts.store, 'message-1')?.state).toBe('queued');
      expect(snapshotOf(parts.store, 'message-2')?.state).toBe('on-hold');
    });

    it('releases an unconfirmed message and queues the edit behind it', async () => {
      seedMessage(parts, {messageId: 'message-1', state: 'on-hold', attempts: 1});
      await startOutbox(parts);
      const message = createMessage(parts, 'message-1');

      await parts.repository.sendMessageEdit(parts.conversation, 'new', message, []);
      await parts.clock.settle();

      expect(snapshotOf(parts.store, 'message-1')).toEqual(
        expect.objectContaining({state: 'queued', payload: expect.objectContaining({text: 'old'})}),
      );
      expect(snapshotOf(parts.store, 'message-1:edit')).toEqual(
        expect.objectContaining({
          kind: 'message',
          lane: {state: 'in-lane', laneKey: MESSAGES_LANE},
          payload: expect.objectContaining({
            type: 'edit',
            originalMessageId: 'message-1',
            text: 'new',
          }),
        }),
      );
      expect(parts.injectEvent).toHaveBeenCalledTimes(1);
      expect(parts.updateEvent).not.toHaveBeenCalled();
    });

    it('sends the edit of a message that was sent in the lane of changes', async () => {
      await startOutbox(parts);
      const message = createMessage(parts, 'sent-1', 'old', StatusType.SENT);

      await parts.repository.sendMessageEdit(parts.conversation, 'new', message, []);
      await parts.clock.settle();

      expect(snapshotOf(parts.store, 'sent-1:edit')).toEqual(
        expect.objectContaining({kind: 'message-change', lane: {state: 'in-lane', laneKey: CHANGES_LANE}}),
      );
      expect(parts.injectEvent).toHaveBeenCalledTimes(1);
    });

    it('keeps the stored record of the message from before the edit, for taking the edit back', async () => {
      await startOutbox(parts);
      const message = createMessage(parts, 'sent-1', 'old', StatusType.SENT);
      const before = {primary_key: 'primary-key', id: 'sent-1', data: {content: 'old'}};
      jest.spyOn(parts.eventService, 'loadEvent').mockResolvedValue(before as any);

      await parts.repository.sendMessageEdit(parts.conversation, 'new', message, []);

      expect(snapshotOf(parts.store, 'sent-1:edit')).toEqual(
        expect.objectContaining({payload: expect.objectContaining({type: 'edit', previousEvent: before})}),
      );
    });

    it('keeps the record from before the first edit when the same message is edited again while it is unsent', async () => {
      await startOutbox(parts);
      const message = createMessage(parts, 'sent-1', 'old', StatusType.SENT);
      const first = {primary_key: 'primary-key', id: 'sent-1', data: {content: 'old'}};
      const second = {primary_key: 'primary-key', id: 'edit-1', data: {content: 'new', replacing_message_id: 'sent-1'}};
      jest
        .spyOn(parts.eventService, 'loadEvent')
        .mockResolvedValueOnce(first as any)
        .mockResolvedValue(second as any);

      await parts.repository.sendMessageEdit(parts.conversation, 'new', message, []);
      await parts.repository.sendMessageEdit(parts.conversation, 'newer', message, []);

      expect(snapshotOf(parts.store, 'sent-1:edit')).toEqual(
        expect.objectContaining({
          payload: expect.objectContaining({text: 'newer', previousEvent: first}),
        }),
      );
    });

    it('keeps the record from before the first edit when the message it made is edited while it is unsent', async () => {
      await startOutbox(parts);
      const first = {primary_key: 'primary-key', id: 'sent-1', data: {content: 'old'}};
      jest.spyOn(parts.eventService, 'loadEvent').mockResolvedValue(first as any);
      await parts.repository.sendMessageEdit(
        parts.conversation,
        'new',
        createMessage(parts, 'sent-1', 'old', StatusType.SENT),
        [],
      );
      const editMessageId = (snapshotOf(parts.store, 'sent-1:edit')?.payload as {messageId: string}).messageId;
      const shown = {
        primary_key: 'primary-key',
        id: editMessageId,
        data: {content: 'new', replacing_message_id: 'sent-1'},
      };
      jest.spyOn(parts.eventService, 'loadEvent').mockResolvedValue(shown as any);

      await parts.repository.sendMessageEdit(
        parts.conversation,
        'newer',
        createMessage(parts, editMessageId, 'new', StatusType.SENT),
        [],
      );

      expect(snapshotOf(parts.store, `${editMessageId}:edit`)).toEqual(
        expect.objectContaining({payload: expect.objectContaining({text: 'newer', previousEvent: first})}),
      );
    });

    it('only changes a failed message locally, and queues nothing', async () => {
      seedMessage(parts, {messageId: 'message-1', state: 'dead-lettered', attempts: 1});
      await startOutbox(parts);
      const message = createMessage(parts, 'message-1', 'old', StatusType.FAILED);

      await parts.repository.sendMessageEdit(parts.conversation, 'new', message, []);

      expect(snapshotOf(parts.store, 'message-1')).toEqual(
        expect.objectContaining({state: 'dead-lettered', payload: expect.objectContaining({text: 'old'})}),
      );
      expect(snapshotOf(parts.store, 'message-1:edit')).toBeUndefined();
      expect(parts.records.get('message-1')?.data).toMatchObject({content: 'new'});
      expect((message.assets()[0] as TextAsset).text).toBe('new');
    });

    it('rejects an edit that changes nothing, as without the outbox', async () => {
      await startOutbox(parts);

      await expect(
        parts.repository.sendMessageEdit(parts.conversation, 'old', createMessage(parts, 'message-1'), []),
      ).rejects.toThrow();
    });
  });

  describe('a change made while the previous change of the same message is being sent', () => {
    /**
     * Holds the first send of a change until it is released, and answers the ones after it at once.
     * A send that ends as canceled has its operation deleted.
     */
    async function holdFirstSend(endState = 'OUTGOING_SENT'): Promise<() => void> {
      let finishSending: () => void = () => {
        return undefined;
      };
      parts.send.mockImplementationOnce(() => {
        return new Promise(resolve => {
          finishSending = () => {
            return resolve({...sentResult(), state: endState});
          };
        });
      });
      return () => {
        return finishSending();
      };
    }

    async function waitForAttempt(): Promise<void> {
      parts.outbox.resume();
      await parts.clock.settle();
      expect(parts.send).toHaveBeenCalledTimes(1);
    }

    it('keeps the reactions from before a first reaction that is still being sent', async () => {
      await startOutbox(parts);
      const message = createMessage(parts, 'sent-1', 'text', StatusType.SENT);
      const self = {id: 'selfid', domain: ''};
      const finishSending = await holdFirstSend('CANCELED');
      await parts.repository.toggleReaction(parts.conversation, message, '👍', self);
      await waitForAttempt();
      expect(snapshotOf(parts.store, 'sent-1:reaction')?.state).toBe('in-progress');
      const enqueue = jest.spyOn((parts.repository as any).outboxKinds.messageChange, 'enqueue');

      message.reactions([['👍', [self]]]);
      const second = parts.repository.toggleReaction(parts.conversation, message, '❤️', self);
      await parts.clock.settle();
      finishSending();
      await second;
      await parts.clock.settle();

      expect(enqueue).toHaveBeenCalledWith(
        expect.objectContaining({payload: expect.objectContaining({reactions: '👍,❤️', previousReactions: ''})}),
      );
    });

    it('stores and sends the second reaction after the first one', async () => {
      await startOutbox(parts);
      const message = createMessage(parts, 'sent-1', 'text', StatusType.SENT);
      const finishSending = await holdFirstSend();
      await parts.repository.toggleReaction(parts.conversation, message, '👍', {id: 'selfid', domain: ''});
      await waitForAttempt();

      message.reactions([['👍', [{id: 'selfid', domain: ''}]]]);
      const second = parts.repository.toggleReaction(parts.conversation, message, '👍', {id: 'selfid', domain: ''});
      await parts.clock.settle();
      finishSending();
      await second;
      await parts.clock.settle();

      expect(parts.send).toHaveBeenCalledTimes(2);
      expect(parts.send.mock.calls[0][0].payload.reaction.emoji).toBe('👍');
      expect(parts.send.mock.calls[1][0].payload.reaction.emoji).toBe('');
      expect(parts.injectEvent).toHaveBeenCalledTimes(2);
    });

    it('sends the second edit after the first one', async () => {
      await startOutbox(parts);
      const message = createMessage(parts, 'sent-1', 'old', StatusType.SENT);
      const finishSending = await holdFirstSend();
      await parts.repository.sendMessageEdit(parts.conversation, 'new', message, []);
      await waitForAttempt();

      const second = parts.repository.sendMessageEdit(parts.conversation, 'newer', message, []);
      await parts.clock.settle();
      finishSending();
      await second;
      await parts.clock.settle();

      expect(parts.send).toHaveBeenCalledTimes(2);
      expect(parts.send.mock.calls[0][0].payload.edited.text.content).toBe('new');
      expect(parts.send.mock.calls[1][0].payload.edited.text.content).toBe('newer');
    });

    it('keeps the record from before a first edit that is still being sent, for the edit of the message it made', async () => {
      await startOutbox(parts);
      const first = {primary_key: 'primary-key', id: 'sent-1', data: {content: 'old'}};
      jest.spyOn(parts.eventService, 'loadEvent').mockResolvedValue(first as any);
      await holdFirstSend();
      await parts.repository.sendMessageEdit(
        parts.conversation,
        'new',
        createMessage(parts, 'sent-1', 'old', StatusType.SENT),
        [],
      );
      await waitForAttempt();
      expect(snapshotOf(parts.store, 'sent-1:edit')?.state).toBe('in-progress');
      const editMessageId = (snapshotOf(parts.store, 'sent-1:edit')?.payload as {messageId: string}).messageId;
      jest.spyOn(parts.eventService, 'loadEvent').mockResolvedValue({
        primary_key: 'primary-key',
        id: editMessageId,
        data: {content: 'new', replacing_message_id: 'sent-1'},
      } as any);

      await parts.repository.sendMessageEdit(
        parts.conversation,
        'newer',
        createMessage(parts, editMessageId, 'new', StatusType.SENT),
        [],
      );

      expect(snapshotOf(parts.store, `${editMessageId}:edit`)).toEqual(
        expect.objectContaining({payload: expect.objectContaining({text: 'newer', previousEvent: first})}),
      );
    });

    describe('when the first change ends deleted', () => {
      const self = {id: 'selfid', domain: ''};

      it('still queues and shows the opposite reaction after an added one', async () => {
        await startOutbox(parts);
        const message = createMessage(parts, 'sent-1', 'text', StatusType.SENT);
        const finishSending = await holdFirstSend('CANCELED');
        await parts.repository.toggleReaction(parts.conversation, message, '👍', self);
        await waitForAttempt();

        message.reactions([['👍', [self]]]);
        const second = parts.repository.toggleReaction(parts.conversation, message, '👍', self);
        await parts.clock.settle();
        finishSending();
        await second;
        await parts.clock.settle();

        expect(parts.sendToBackend).toHaveBeenCalledTimes(2);
        expect(parts.sendToBackend.mock.calls[1][0].reaction.emoji).toBe('');
        // Shown for each toggle, and once more for the revert of the deleted first one
        expect(parts.inject).toHaveBeenCalledTimes(3);
      });

      it('still queues and shows a reaction added again after a removed one', async () => {
        await startOutbox(parts);
        const message = createMessage(parts, 'sent-1', 'text', StatusType.SENT);
        message.reactions([['👍', [self]]]);
        const finishSending = await holdFirstSend('CANCELED');
        await parts.repository.toggleReaction(parts.conversation, message, '👍', self);
        await waitForAttempt();

        message.reactions([]);
        const second = parts.repository.toggleReaction(parts.conversation, message, '👍', self);
        await parts.clock.settle();
        finishSending();
        await second;
        await parts.clock.settle();

        expect(parts.sendToBackend).toHaveBeenCalledTimes(2);
        expect(parts.sendToBackend.mock.calls[1][0].reaction.emoji).toBe('👍');
        // Shown for each toggle, and once more for the revert of the deleted first one
        expect(parts.inject).toHaveBeenCalledTimes(3);
      });

      it('still sends the second edit of the same message', async () => {
        await startOutbox(parts);
        const message = createMessage(parts, 'sent-1', 'old', StatusType.SENT);
        const finishSending = await holdFirstSend('CANCELED');
        await parts.repository.sendMessageEdit(parts.conversation, 'new', message, []);
        await waitForAttempt();

        const second = parts.repository.sendMessageEdit(parts.conversation, 'newer', message, []);
        await parts.clock.settle();
        finishSending();
        await second;
        await parts.clock.settle();

        expect(parts.sendToBackend).toHaveBeenCalledTimes(2);
        expect(parts.sendToBackend.mock.calls[1][0].edited.text.content).toBe('newer');
      });
    });

    it('sends the second hide after the first one', async () => {
      await startOutbox(parts);
      const message = createMessage(parts, 'sent-1', 'text', StatusType.SENT);
      const finishSending = await holdFirstSend();
      await parts.repository.deleteMessage(parts.conversation, message);
      await waitForAttempt();

      const second = parts.repository.deleteMessage(parts.conversation, message);
      await parts.clock.settle();
      finishSending();
      await second;
      await parts.clock.settle();

      expect(parts.send).toHaveBeenCalledTimes(2);
      expect(parts.outbox.findByCorrelationKey('sent-1:hide').outcome).toBe('operation-not-found');
    });
  });

  describe('telling what a delete may offer', () => {
    it('knows a pending message nobody can have', async () => {
      seedMessage(parts, {messageId: 'message-1'});
      await startOutbox(parts);

      expect(parts.repository.isPendingAndNeverAttempted('message-1')).toBe(true);
    });

    it('does not count an unconfirmed message, or one the outbox does not have', async () => {
      seedMessage(parts, {messageId: 'message-1', attempts: 1});
      seedMessage(parts, {messageId: 'message-2', queuedSeq: 2, mayBeDelivered: true});
      await startOutbox(parts);

      expect(parts.repository.isPendingAndNeverAttempted('message-1')).toBe(false);
      expect(parts.repository.isPendingAndNeverAttempted('message-2')).toBe(false);
      expect(parts.repository.isPendingAndNeverAttempted('unknown')).toBe(false);
    });

    it('counts the text and file messages waiting, not what is queued behind them or in other lanes', async () => {
      seedMessage(parts, {messageId: 'message-1'});
      seedMessage(parts, {messageId: 'message-2', queuedSeq: 2, state: 'on-hold'});
      seedMessage(parts, {messageId: 'message-3', queuedSeq: 3, state: 'dead-lettered'});
      parts.store.seed(
        createStoredSnapshot({
          kind: 'message',
          id: 'operation-asset',
          correlation: {state: 'correlated', correlationKey: 'asset-1'},
          lane: {state: 'in-lane', laneKey: CONVERSATION_ID.id},
          queuedSeq: 4,
          payload: {
            type: 'asset',
            conversationId: CONVERSATION_ID,
            messageId: 'asset-1',
            asImage: false,
          },
          expiry: {state: 'expires-at', serverTime: 1_000_000 + TIME_IN_MILLIS.WEEK},
        }),
      );
      parts.store.seed(
        createStoredSnapshot({
          kind: 'message',
          id: 'operation-reaction',
          correlation: {state: 'correlated', correlationKey: 'message-1:reaction'},
          lane: {state: 'in-lane', laneKey: CONVERSATION_ID.id},
          queuedSeq: 5,
          payload: {
            type: 'reaction',
            conversationId: CONVERSATION_ID,
            targetMessageId: 'message-1',
            reactions: '👍',
          },
          expiry: {state: 'expires-at', serverTime: 1_000_000 + TIME_IN_MILLIS.WEEK},
        }),
      );
      parts.store.seed(
        createStoredSnapshot({
          kind: 'message-change',
          id: 'operation-hide',
          correlation: {state: 'correlated', correlationKey: 'sent-1:hide'},
          lane: {state: 'in-lane', laneKey: CHANGES_LANE},
          payload: {type: 'hide', conversationId: CONVERSATION_ID, targetMessageId: 'sent-1'},
          expiry: {state: 'expires-at', serverTime: 1_000_000 + TIME_IN_MILLIS.WEEK},
        }),
      );
      await startOutbox(parts);

      expect(parts.repository.countPendingMessages()).toBe(3);
    });

    it('stops counting a message once it went out', async () => {
      seedMessage(parts, {messageId: 'message-1'});
      await startOutbox(parts);
      expect(parts.repository.countPendingMessages()).toBe(1);

      parts.outbox.resume();
      await parts.clock.settle();

      expect(parts.repository.countPendingMessages()).toBe(0);
    });
  });

  describe('deleting', () => {
    function deleteForEveryone(message: ContentMessage): Promise<void> {
      return parts.repository.deleteMessageForEveryone(parts.conversation, message);
    }

    it('before sending removes the message and its changes, and sends nothing', async () => {
      seedMessage(parts, {messageId: 'message-1'});
      parts.store.seed(
        createStoredSnapshot({
          kind: 'message',
          id: 'operation-reaction',
          correlation: {state: 'correlated', correlationKey: 'message-1:reaction'},
          lane: {state: 'in-lane', laneKey: MESSAGES_LANE},
          queuedSeq: 2,
          payload: {
            type: 'reaction',
            conversationId: CONVERSATION_ID,
            targetMessageId: 'message-1',
            reactions: '👍',
          },
          expiry: {state: 'expires-at', serverTime: 1_000_000 + TIME_IN_MILLIS.WEEK},
        }),
      );
      await startOutbox(parts);

      await deleteForEveryone(createMessage(parts, 'message-1'));
      parts.outbox.resume();
      await parts.clock.settle();

      expect(parts.outbox.findByCorrelationKey('message-1').outcome).toBe('operation-not-found');
      expect(parts.outbox.findByCorrelationKey('message-1:reaction').outcome).toBe('operation-not-found');
      expect(parts.deleteEvent).toHaveBeenCalledWith(CONVERSATION_ID.id, 'message-1');
      expect(parts.send).not.toHaveBeenCalled();
      expect(
        parts.store.operationIds().filter(id => {
          return parts.store.history(id).at(-1)?.kind === 'message-change';
        }),
      ).toEqual([]);
    });

    it('for me, before sending, also sends nothing', async () => {
      seedMessage(parts, {messageId: 'message-1'});
      await startOutbox(parts);

      await parts.repository.deleteMessage(parts.conversation, createMessage(parts, 'message-1'));
      parts.outbox.resume();
      await parts.clock.settle();

      expect(parts.outbox.findByCorrelationKey('message-1').outcome).toBe('operation-not-found');
      expect(parts.send).not.toHaveBeenCalled();
      expect(parts.deleteEvent).toHaveBeenCalledWith(CONVERSATION_ID.id, 'message-1');
    });

    it.each(['outbox-not-started', 'storage-full', 'storage-failed'])(
      'keeps the message when the outbox answers %s to its deletion',
      async outcome => {
        seedMessage(parts, {messageId: 'message-1'});
        if (outcome !== 'outbox-not-started') {
          await startOutbox(parts);
        }
        if (outcome === 'storage-failed') {
          parts.store.fail('append', true);
        }
        if (outcome === 'storage-full') {
          parts.store.fill(true);
        }

        await deleteForEveryone(createMessage(parts, 'message-1'));

        expect(parts.deleteEvent).not.toHaveBeenCalled();
        expect(parts.send).not.toHaveBeenCalled();
      },
    );

    it('a message with a later message in its conversation deletes only itself, and the later one still goes out', async () => {
      seedMessage(parts, {messageId: 'message-1'});
      seedMessage(parts, {messageId: 'message-2', queuedSeq: 2});
      await startOutbox(parts);

      await deleteForEveryone(createMessage(parts, 'message-1'));

      expect(parts.outbox.findByCorrelationKey('message-1').outcome).toBe('operation-not-found');
      expect(parts.outbox.findByCorrelationKey('message-1:delete').outcome).toBe('operation-not-found');
      expect(parts.outbox.findByCorrelationKey('message-2')).toEqual(
        expect.objectContaining({outcome: 'operation-found', operation: expect.objectContaining({state: 'queued'})}),
      );
      expect(parts.deleteEvent).toHaveBeenCalledWith(CONVERSATION_ID.id, 'message-1');

      parts.outbox.resume();
      await parts.clock.settle();

      expect(parts.send).toHaveBeenCalledTimes(1);
      expect(parts.outbox.findByCorrelationKey('message-2').outcome).toBe('operation-not-found');
    });

    it('for everyone, of a message that may have been delivered, deletes it and sends a deletion', async () => {
      seedMessage(parts, {messageId: 'message-1', attempts: 1});
      await startOutbox(parts);

      await deleteForEveryone(createMessage(parts, 'message-1'));

      expect(parts.outbox.findByCorrelationKey('message-1').outcome).toBe('operation-not-found');
      expect(snapshotOf(parts.store, 'message-1:delete')).toEqual(
        expect.objectContaining({
          kind: 'message-change',
          lane: {state: 'in-lane', laneKey: CHANGES_LANE},
          payload: expect.objectContaining({type: 'delete', targetMessageId: 'message-1'}),
        }),
      );
      expect(parts.deleteEvent).toHaveBeenCalledWith(CONVERSATION_ID.id, 'message-1');
    });

    it('for me, of a message that may have been delivered, deletes it and hides it', async () => {
      seedMessage(parts, {messageId: 'message-1', mayBeDelivered: true});
      await startOutbox(parts);

      await parts.repository.deleteMessage(parts.conversation, createMessage(parts, 'message-1'));

      expect(parts.outbox.findByCorrelationKey('message-1').outcome).toBe('operation-not-found');
      expect(snapshotOf(parts.store, 'message-1:hide')).toEqual(
        expect.objectContaining({kind: 'message-change', lane: {state: 'in-lane', laneKey: CHANGES_LANE}}),
      );
    });

    it('for everyone, of a message being sent, queues the deletion behind it and keeps it out of sight', async () => {
      seedMessage(parts, {messageId: 'message-1'});
      await startOutbox(parts);
      let finishSending: () => void = () => {
        return undefined;
      };
      parts.send.mockImplementationOnce(() => {
        return new Promise(resolve => {
          finishSending = () => {
            return resolve(sentResult('message-1'));
          };
        });
      });
      parts.outbox.resume();
      await parts.clock.settle();
      expect(snapshotOf(parts.store, 'message-1')?.state).toBe('in-progress');

      await deleteForEveryone(createMessage(parts, 'message-1'));

      expect(snapshotOf(parts.store, 'message-1')?.state).toBe('in-progress');
      expect(snapshotOf(parts.store, 'message-1:delete')).toEqual(
        expect.objectContaining({
          kind: 'message',
          lane: {state: 'in-lane', laneKey: MESSAGES_LANE},
          state: 'queued',
        }),
      );
      expect(parts.deleteEvent).toHaveBeenCalledTimes(1);

      finishSending();
      await parts.clock.settle();

      expect(parts.send).toHaveBeenCalledTimes(2);
      expect(parts.send.mock.calls[1][0].payload.deleted.messageId).toBe('message-1');
      expect(parts.outbox.findByCorrelationKey('message-1:delete').outcome).toBe('operation-not-found');
      // The message was not shown again
      expect(parts.injectEvent).not.toHaveBeenCalled();
    });

    it('during an attempt does not bring the message back when the attempt succeeds', async () => {
      seedMessage(parts, {messageId: 'message-1'});
      await startOutbox(parts);
      let finishSending: () => void = () => {
        return undefined;
      };
      parts.send.mockImplementationOnce(() => {
        return new Promise(resolve => {
          finishSending = () => {
            return resolve(sentResult('message-1'));
          };
        });
      });
      parts.outbox.resume();
      await parts.clock.settle();
      expect(parts.send).toHaveBeenCalledTimes(1);

      await deleteForEveryone(createMessage(parts, 'message-1'));
      expect(parts.records.has('message-1')).toBe(false);
      parts.updateEvent.mockClear();
      finishSending();
      await parts.clock.settle();

      expect(parts.outbox.findByCorrelationKey('message-1').outcome).toBe('operation-not-found');
      expect(parts.updateEvent).not.toHaveBeenCalled();
      expect(parts.injectEvent).not.toHaveBeenCalled();
    });

    it('of a message that was sent goes to the lane of changes, and the message goes at once', async () => {
      await startOutbox(parts);

      await deleteForEveryone(createMessage(parts, 'sent-1', 'text', StatusType.SENT));

      expect(snapshotOf(parts.store, 'sent-1:delete')).toEqual(
        expect.objectContaining({kind: 'message-change', lane: {state: 'in-lane', laneKey: CHANGES_LANE}}),
      );
      expect(parts.deleteEvent).toHaveBeenCalledWith(CONVERSATION_ID.id, 'sent-1');
    });

    it('for me, of a message that was sent, hides it in the lane of changes', async () => {
      await startOutbox(parts);

      await parts.repository.deleteMessage(parts.conversation, createMessage(parts, 'sent-1', 'text', StatusType.SENT));

      expect(snapshotOf(parts.store, 'sent-1:hide')).toEqual(
        expect.objectContaining({kind: 'message-change', lane: {state: 'in-lane', laneKey: CHANGES_LANE}}),
      );
      expect(parts.deleteEvent).toHaveBeenCalledWith(CONVERSATION_ID.id, 'sent-1');
    });

    it('for me, of a message that was sent, keeps its stored record for showing it again', async () => {
      await startOutbox(parts);
      const record = {primary_key: 'primary-key', id: 'sent-1', data: {content: 'text'}};
      jest.spyOn(parts.eventService, 'loadEvent').mockResolvedValue(record as any);

      await parts.repository.deleteMessage(parts.conversation, createMessage(parts, 'sent-1', 'text', StatusType.SENT));

      expect(snapshotOf(parts.store, 'sent-1:hide')).toEqual(
        expect.objectContaining({payload: expect.objectContaining({type: 'hide', removedEvent: record})}),
      );
    });

    it('for everyone, of a message that was sent, keeps its stored record for showing it again', async () => {
      await startOutbox(parts);
      const record = {primary_key: 'primary-key', id: 'sent-1', data: {content: 'text'}};
      jest.spyOn(parts.eventService, 'loadEvent').mockResolvedValue(record as any);

      await deleteForEveryone(createMessage(parts, 'sent-1', 'text', StatusType.SENT));

      expect(snapshotOf(parts.store, 'sent-1:delete')).toEqual(
        expect.objectContaining({
          kind: 'message-change',
          payload: expect.objectContaining({type: 'delete', removedEvent: record}),
        }),
      );
    });
  });

  describe('taking back a change that was deleted unsent', () => {
    const edited = {primary_key: 'primary-key', id: 'edit-1', edited_time: 'now', data: {content: 'new'}};
    const original = {id: 'sent-1', data: {content: 'old'}};

    it('stores the record from before an edit over the shown one, with nothing left of the edit', async () => {
      const replaceEvent = jest.spyOn(parts.eventService, 'replaceEvent').mockResolvedValue({} as any);
      jest.spyOn(parts.eventService, 'loadEvent').mockResolvedValue(edited as any);

      const restored = await (parts.repository as any).restoreEditedMessage(parts.conversation, {
        messageId: 'edit-1',
        previousEvent: original,
      });

      expect(restored).toBe(true);
      expect(replaceEvent).toHaveBeenCalledWith({
        edited_time: undefined,
        ...original,
        primary_key: 'primary-key',
      });
    });

    it('leaves an edit that a later edit replaced alone', async () => {
      const replaceEvent = jest.spyOn(parts.eventService, 'replaceEvent').mockResolvedValue({} as any);
      jest.spyOn(parts.eventService, 'loadEvent').mockResolvedValue({...edited, id: 'edit-2'} as any);

      const restored = await (parts.repository as any).restoreEditedMessage(parts.conversation, {
        messageId: 'edit-1',
        previousEvent: original,
      });

      expect(restored).toBe(false);
      expect(replaceEvent).not.toHaveBeenCalled();
    });

    it('shows a removed message again by injecting its stored record, without the old primary key', async () => {
      const injectEvent = jest
        .spyOn((parts.repository as any).eventRepository, 'injectEvent')
        .mockResolvedValue(undefined);
      jest.spyOn(parts.eventService, 'loadEvent').mockResolvedValue(undefined);

      const restored = await (parts.repository as any).restoreRemovedMessage(parts.conversation, {
        ...original,
        primary_key: 'primary-key',
      });

      expect(restored).toBe(true);
      expect(injectEvent).toHaveBeenCalledWith(original);
    });

    it('does not inject a removed message that is stored again', async () => {
      const injectEvent = jest
        .spyOn((parts.repository as any).eventRepository, 'injectEvent')
        .mockResolvedValue(undefined);
      jest.spyOn(parts.eventService, 'loadEvent').mockResolvedValue(original as any);

      const restored = await (parts.repository as any).restoreRemovedMessage(parts.conversation, original);

      expect(restored).toBe(false);
      expect(injectEvent).not.toHaveBeenCalled();
    });

    it('tells the listeners of the change that was undone, until they stop listening', () => {
      const listener = jest.fn();
      const stop = parts.repository.onChangeUndone(listener);

      (parts.repository as any).notifyChangeUndone('edit');
      stop();
      (parts.repository as any).notifyChangeUndone('delete');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('edit');
    });
  });

  describe('a reply and a reaction to a message that failed', () => {
    let failedReasons: Map<string, string | undefined>;

    function sentIds(): string[] {
      return parts.sendToBackend.mock.calls.map(([message]) => {
        return message.reaction ? `reaction:${message.reaction.messageId}` : message.messageId;
      });
    }

    let knownReplyId: string | undefined;

    /** The id the reply got when it was queued; the operation is gone once it was sent */
    function replyId(): string {
      if (knownReplyId !== undefined) {
        return knownReplyId;
      }
      const operation = parts.store
        .operationIds()
        .map(id => {
          return parts.store.history(id).at(-1) as OperationSnapshot;
        })
        .find(({payload}) => {
          return (payload as {type: string; quote?: unknown}).type === 'text' && (payload as {quote?: unknown}).quote;
        });
      knownReplyId = (operation?.payload as {messageId: string}).messageId;
      return knownReplyId;
    }

    function sendReply(): Promise<void> {
      return parts.repository.sendTextWithLinkPreview({
        conversation: parts.conversation,
        textMessage: 'reply',
        mentions: [],
        QuoteEntity: {messageId: 'message-1', userId: 'selfid'} as never,
      });
    }

    function retryReply(): Promise<void> {
      return parts.repository.retryTextMessage({
        conversation: parts.conversation,
        textMessage: 'reply',
        mentions: [],
        QuoteEntity: {messageId: 'message-1', userId: 'selfid'} as never,
        messageId: replyId(),
      });
    }

    beforeEach(async () => {
      failedReasons = new Map();
      const setStatus = (parts.repository as any).markMessage.bind(parts.repository);
      jest
        .spyOn(parts.repository as any, 'markMessage')
        .mockImplementation(
          async (conversation: Conversation, messageId: string, status: StatusType, reason?: string) => {
            failedReasons.set(messageId, status === StatusType.FAILED ? reason : undefined);
            return setStatus(conversation, messageId, status, reason);
          },
        );
      jest.spyOn(parts.eventService, 'loadEvent').mockImplementation(async (_conversationId, messageId) => {
        const reason = failedReasons.get(messageId);
        return {
          primary_key: 'primary-key',
          id: messageId,
          status: reason === undefined ? StatusType.SENDING : StatusType.FAILED,
          failed_reason: reason,
        } as any;
      });
      jest.spyOn(parts.repository as any, 'buildOutboxText').mockImplementation(async (_conversation, payload: any) => {
        return new GenericMessage({messageId: payload.messageId});
      });
      seedMessage(parts, {messageId: 'message-1', state: 'dead-lettered', attempts: 0});
      await startOutbox(parts);
      parts.outbox.resume();
      knownReplyId = undefined;
      await sendReply();
      replyId();
      await react(createMessage(parts, 'message-1', 'old', StatusType.FAILED), '❤️');
      await parts.clock.advance(1_000);
    });

    function react(message: ContentMessage, reaction: string): Promise<unknown> | null {
      return parts.repository.toggleReaction(parts.conversation, message, reaction, {id: 'selfid', domain: ''});
    }

    it('are failed with the generic reason and send nothing', async () => {
      expect(sentIds()).toEqual([]);
      expect(snapshotOf(parts.store, replyId())).toEqual(expect.objectContaining({state: 'dead-lettered'}));
      expect(snapshotOf(parts.store, 'message-1:reaction')).toEqual(expect.objectContaining({state: 'dead-lettered'}));
      expect(failedReasons.get(replyId())).toBe('generic');
    });

    it('go out after the message when it is sent again', async () => {
      await parts.repository.retryTextMessage({
        conversation: parts.conversation,
        textMessage: 'old',
        mentions: [],
        messageId: 'message-1',
      });
      await parts.clock.advance(1_000);

      expect(sentIds()).toEqual(['message-1', replyId(), 'reaction:message-1']);
    });

    it('leave a reply that failed for a reason of its own failed when the message is sent again', async () => {
      failedReasons.set(replyId(), 'rejected');

      await parts.repository.retryTextMessage({
        conversation: parts.conversation,
        textMessage: 'old',
        mentions: [],
        messageId: 'message-1',
      });
      await parts.clock.advance(1_000);

      expect(sentIds()).toEqual(['message-1', 'reaction:message-1']);
    });

    it('fail again when the reply is sent again while the message is failed', async () => {
      await retryReply();
      await parts.clock.advance(1_000);

      expect(sentIds()).toEqual([]);
      expect(snapshotOf(parts.store, replyId())).toEqual(expect.objectContaining({state: 'dead-lettered'}));
      expect(failedReasons.get(replyId())).toBe('generic');
    });

    it('lose the reaction, and keep the reply with its Retry, when the message is deleted', async () => {
      await parts.repository.deleteMessageForEveryone(
        parts.conversation,
        createMessage(parts, 'message-1', 'old', StatusType.FAILED),
      );
      expect(parts.outbox.findByCorrelationKey('message-1:reaction').outcome).toBe('operation-not-found');

      await retryReply();
      await parts.clock.advance(1_000);

      expect(sentIds()).toEqual([replyId()]);
    });
  });
});
