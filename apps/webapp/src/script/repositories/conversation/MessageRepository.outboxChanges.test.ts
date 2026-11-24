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

import {CONVERSATION_PROTOCOL} from '../../apiClient/team/feature/featureList.types';
import {MessageSendingState} from '../../core/conversation';
import {MessageTimer} from '../../core/conversation/messageTimer/messageTimer';
import {StatusType} from '../../message/statusType';
import {createOutbox, type OperationSnapshot, type Outbox} from '../../outbox';
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
import {ContentMessage} from '../entity/message/contentMessage';
import {Text as TextAsset} from '../entity/message/text';
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
import {validate as isUuid} from 'uuid';

import {TIME_IN_MILLIS} from '../../util/timeUtil';

const CONVERSATION_ID = {id: 'conversation-1', domain: 'wire.test'};
const CHANGES_LANE = `${CONVERSATION_ID.id}#changes`;

type Parts = {
  repository: MessageRepository;
  conversation: Conversation;
  eventService: EventService;
  store: InMemoryOutboxStore;
  clock: FakeClock;
  invoker: FireAndForgetInvoker;
  outbox: Outbox;
  selfUser: User;
  send: jest.Mock;
  sendToBackend: jest.SpyInstance;
  inject: jest.SpyInstance;
  updateEvent: jest.SpyInstance;
  deleteEvent: jest.SpyInstance;
  isBeingEdited: jest.Mock;
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
  const invoker = createFireAndForgetInvoker({reportError: jest.fn()});
  const store = createInMemoryOutboxStore();
  const outbox = createOutbox({
    store,
    getServerTime: clock.getServerTime,
    logger: {info: jest.fn(), warn: jest.fn(), error: jest.fn()},
  });
  const isBeingEdited = jest.fn().mockResolvedValue(false);

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
    userState,
    clientState,
    conversationState,
    new TeamState(),
    createCoreTestFixture({service: {conversation: {send, messageTimer: new MessageTimer()}}}),
    outbox,
    isBeingEdited,
    invoker,
  );

  const sendToBackend = jest.spyOn(repository as any, 'sendMessageToBackend').mockResolvedValue({
    id: 'sent',
    sentAt: new Date(1_000_000).toISOString(),
    state: MessageSendingState.OUTGOING_SENT,
  });
  const inject = jest.spyOn(repository as any, 'injectOptimisticMessage').mockResolvedValue(true);
  jest.spyOn(conversation, 'getMessage').mockReturnValue({
    status: jest.fn(),
    ephemeral_expires: jest.fn(() => {
      return false;
    }),
    failed_reason: jest.fn(),
    primary_key: 'primary-key',
  } as never);
  const storedRecord = {
    primary_key: 'primary-key',
    id: 'message-1',
    type: 'conversation.message-add',
    conversation: CONVERSATION_ID.id,
    from: 'selfid',
    time: new Date(1_000_000).toISOString(),
    status: StatusType.SENDING,
    data: {content: 'old', mentions: [], previews: []},
  } as any;
  // The tests name their messages. An edit gets a new uuid, under which nothing is stored before the edit is shown.
  jest.spyOn(eventService, 'loadEvent').mockImplementation(async (_conversationId, messageId) => {
    return isUuid(messageId) ? undefined : storedRecord;
  });
  const updateEvent = jest.spyOn(eventService, 'updateEvent').mockResolvedValue({} as any);
  const deleteEvent = jest.spyOn(eventService, 'deleteEvent').mockResolvedValue(1);

  return {
    repository,
    conversation,
    eventService,
    store,
    clock,
    invoker,
    outbox,
    selfUser,
    send,
    sendToBackend,
    inject,
    updateEvent,
    deleteEvent,
    isBeingEdited,
  };
}

async function startOutbox({clock, outbox}: Parts): Promise<void> {
  const outcome = await outbox.start();
  expect(outcome.type).toBe('outbox-started');
  await clock.settle();
}

/** The latest snapshot of the operation with this correlation key, if the store has one */
function snapshotOf(store: InMemoryOutboxStore, correlationKey: string): OperationSnapshot | undefined {
  return store
    .operationIds()
    .map(id => {
      return store.history(id).at(-1) as OperationSnapshot;
    })
    .find(snapshot => {
      return snapshot.correlationKey === correlationKey;
    });
}

function seedMessage(
  parts: Parts,
  overrides: Partial<OperationSnapshot> & {messageId?: string; mayBeDelivered?: true} = {},
): string {
  const {messageId = 'message-1', mayBeDelivered, ...snapshot} = overrides;
  parts.store.seed(
    createStoredSnapshot({
      kind: 'message',
      id: `operation-${messageId}`,
      correlationKey: messageId,
      orderingKey: CONVERSATION_ID.id,
      payload: {
        type: 'text',
        conversationId: CONVERSATION_ID,
        messageId,
        text: 'old',
        mentions: [],
        mayBeDelivered,
      },
      validUntil: 1_000_000 + TIME_IN_MILLIS.WEEK,
      ...snapshot,
    }),
  );
  return messageId;
}

function createMessage(parts: Parts, id: string, text = 'old', status = StatusType.SENDING): ContentMessage {
  const message = new ContentMessage(id, translateForTest);
  message.user(parts.selfUser);
  message.status(status);
  message.assets.push(new TextAsset(id, text));
  Object.assign(message, {primary_key: 'primary-key'});
  return message;
}

describe('MessageRepository routes changes through the outbox', () => {
  let parts: Parts;

  beforeEach(() => {
    parts = buildParts();
  });

  afterEach(() => {
    parts.clock.dispose();
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
          orderingKey: CONVERSATION_ID.id,
          payload: {
            type: 'reaction',
            conversationId: CONVERSATION_ID,
            targetMessageId: 'message-1',
            reactions: '❤️',
          },
        }),
      );
      expect(parts.inject).toHaveBeenCalledTimes(1);
      expect(parts.sendToBackend).not.toHaveBeenCalled();
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
          return parts.store.history(id).at(-1)?.correlationKey === 'message-1:reaction';
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
      expect(parts.sendToBackend).toHaveBeenCalledTimes(1);
      expect(snapshotOf(parts.store, 'pending-1')?.state).toBe('on-hold');
    });

    it('is stored in the lane of changes when its message is not in the outbox', async () => {
      await startOutbox(parts);
      const sent = createMessage(parts, 'sent-1', 'text', StatusType.SENT);

      await react(sent, '👍');

      expect(snapshotOf(parts.store, 'sent-1:reaction')).toEqual(
        expect.objectContaining({kind: 'message-change', orderingKey: CHANGES_LANE, state: 'queued'}),
      );
    });

    it('keeps following its message once that went out, while its own reaction is still waiting', async () => {
      seedMessage(parts, {messageId: 'message-1'});
      parts.store.seed(
        createStoredSnapshot({
          kind: 'message',
          id: 'operation-reaction',
          correlationKey: 'message-1:reaction',
          orderingKey: CONVERSATION_ID.id,
          payload: {
            type: 'reaction',
            conversationId: CONVERSATION_ID,
            targetMessageId: 'message-1',
            reactions: '👍',
          },
          queuedSeq: 2,
          validUntil: 1_000_000 + TIME_IN_MILLIS.WEEK,
        }),
      );
      await startOutbox(parts);
      // The message itself is gone from the outbox, but its reaction is not
      await parts.outbox.drop('message-1');

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
      expect(parts.updateEvent).toHaveBeenCalledWith(
        'primary-key',
        expect.objectContaining({data: expect.objectContaining({content: 'new', mentions: []})}),
      );
      const [shown] = message.assets() as TextAsset[];
      expect(shown.text).toBe('new');
      expect(message.id).toBe('message-1');
      expect(message.was_edited()).toBe(false);
      expect(parts.inject).not.toHaveBeenCalled();
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
      parts.isBeingEdited.mockImplementation(async (_conversation, messageId) => {
        return messageId === 'message-1';
      });
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
          orderingKey: CONVERSATION_ID.id,
          payload: expect.objectContaining({
            type: 'edit',
            originalMessageId: 'message-1',
            text: 'new',
          }),
        }),
      );
      expect(parts.inject).toHaveBeenCalledTimes(1);
      expect(parts.updateEvent).not.toHaveBeenCalled();
    });

    it('sends the edit of a message that was sent in the lane of changes', async () => {
      await startOutbox(parts);
      const message = createMessage(parts, 'sent-1', 'old', StatusType.SENT);

      await parts.repository.sendMessageEdit(parts.conversation, 'new', message, []);
      await parts.clock.settle();

      expect(snapshotOf(parts.store, 'sent-1:edit')).toEqual(
        expect.objectContaining({kind: 'message-change', orderingKey: CHANGES_LANE}),
      );
      expect(parts.inject).toHaveBeenCalledTimes(1);
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
      expect(parts.updateEvent).toHaveBeenCalledWith(
        'primary-key',
        expect.objectContaining({data: expect.objectContaining({content: 'new'})}),
      );
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
    /** Holds the first send of a change until it is released, and answers the ones after it at once */
    async function holdFirstSend(): Promise<() => void> {
      let finishSending: () => void = () => {
        return undefined;
      };
      parts.sendToBackend.mockImplementationOnce(() => {
        return new Promise(resolve => {
          finishSending = () => {
            return resolve({id: 'sent', sentAt: new Date(1_000_000).toISOString(), state: 'OUTGOING_SENT'});
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
      expect(parts.sendToBackend).toHaveBeenCalledTimes(1);
    }

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

      expect(parts.sendToBackend).toHaveBeenCalledTimes(2);
      expect(parts.sendToBackend.mock.calls[0][0].reaction.emoji).toBe('👍');
      expect(parts.sendToBackend.mock.calls[1][0].reaction.emoji).toBe('');
      expect(parts.inject).toHaveBeenCalledTimes(2);
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

      expect(parts.sendToBackend).toHaveBeenCalledTimes(2);
      expect(parts.sendToBackend.mock.calls[0][0].edited.text.content).toBe('new');
      expect(parts.sendToBackend.mock.calls[1][0].edited.text.content).toBe('newer');
    });

    it('sends the second hide after the first one', async () => {
      await startOutbox(parts);
      const message = createMessage(parts, 'sent-1', 'text', StatusType.SENT);
      // The hide goes to the self conversations
      jest
        .spyOn((parts.repository as any).conversationState, 'getSelfConversations')
        .mockReturnValue([parts.conversation]);
      const finishSending = await holdFirstSend();
      await parts.repository.deleteMessage(parts.conversation, message);
      await waitForAttempt();

      const second = parts.repository.deleteMessage(parts.conversation, message);
      await parts.clock.settle();
      finishSending();
      await second;
      await parts.clock.settle();

      expect(parts.sendToBackend).toHaveBeenCalledTimes(2);
      expect(parts.outbox.findByCorrelationKey('sent-1:hide').type).toBe('operation-not-found');
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

    it('counts the operations waiting in lanes that start with a message', async () => {
      seedMessage(parts, {messageId: 'message-1'});
      seedMessage(parts, {messageId: 'message-2', queuedSeq: 2});
      await startOutbox(parts);

      expect(parts.repository.countPendingMessages()).toBe(2);
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
          correlationKey: 'message-1:reaction',
          orderingKey: CONVERSATION_ID.id,
          queuedSeq: 2,
          payload: {
            type: 'reaction',
            conversationId: CONVERSATION_ID,
            targetMessageId: 'message-1',
            reactions: '👍',
          },
          validUntil: 1_000_000 + TIME_IN_MILLIS.WEEK,
        }),
      );
      await startOutbox(parts);

      await deleteForEveryone(createMessage(parts, 'message-1'));
      parts.outbox.resume();
      await parts.clock.settle();

      expect(parts.outbox.findByCorrelationKey('message-1').type).toBe('operation-not-found');
      expect(parts.outbox.findByCorrelationKey('message-1:reaction').type).toBe('operation-not-found');
      expect(parts.deleteEvent).toHaveBeenCalledWith(CONVERSATION_ID.id, 'message-1');
      expect(parts.sendToBackend).not.toHaveBeenCalled();
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

      expect(parts.outbox.findByCorrelationKey('message-1').type).toBe('operation-not-found');
      expect(parts.sendToBackend).not.toHaveBeenCalled();
      expect(parts.deleteEvent).toHaveBeenCalledWith(CONVERSATION_ID.id, 'message-1');
    });

    it('for everyone, of a message that may have been delivered, drops it and sends a deletion', async () => {
      seedMessage(parts, {messageId: 'message-1', attempts: 1});
      await startOutbox(parts);

      await deleteForEveryone(createMessage(parts, 'message-1'));

      expect(parts.outbox.findByCorrelationKey('message-1').type).toBe('operation-not-found');
      expect(snapshotOf(parts.store, 'message-1:delete')).toEqual(
        expect.objectContaining({
          kind: 'message-change',
          orderingKey: CHANGES_LANE,
          payload: expect.objectContaining({type: 'delete', targetMessageId: 'message-1'}),
        }),
      );
      expect(parts.deleteEvent).toHaveBeenCalledWith(CONVERSATION_ID.id, 'message-1');
    });

    it('for me, of a message that may have been delivered, drops it and hides it', async () => {
      seedMessage(parts, {messageId: 'message-1', mayBeDelivered: true});
      await startOutbox(parts);

      await parts.repository.deleteMessage(parts.conversation, createMessage(parts, 'message-1'));

      expect(parts.outbox.findByCorrelationKey('message-1').type).toBe('operation-not-found');
      expect(snapshotOf(parts.store, 'message-1:hide')).toEqual(
        expect.objectContaining({kind: 'message-change', orderingKey: CHANGES_LANE}),
      );
    });

    it('for everyone, of a message being sent, queues the deletion behind it and keeps it out of sight', async () => {
      seedMessage(parts, {messageId: 'message-1'});
      await startOutbox(parts);
      let finishSending: () => void = () => {
        return undefined;
      };
      parts.sendToBackend.mockImplementationOnce(() => {
        return new Promise(resolve => {
          finishSending = () => {
            return resolve({id: 'message-1', sentAt: new Date(1_000_000).toISOString(), state: 'OUTGOING_SENT'});
          };
        });
      });
      parts.outbox.resume();
      await parts.clock.settle();
      expect(snapshotOf(parts.store, 'message-1')?.state).toBe('in-progress');

      await deleteForEveryone(createMessage(parts, 'message-1'));

      expect(snapshotOf(parts.store, 'message-1')?.state).toBe('in-progress');
      expect(snapshotOf(parts.store, 'message-1:delete')).toEqual(
        expect.objectContaining({kind: 'message', orderingKey: CONVERSATION_ID.id, state: 'queued'}),
      );
      expect(parts.deleteEvent).toHaveBeenCalledTimes(1);

      finishSending();
      await parts.clock.settle();

      expect(parts.sendToBackend).toHaveBeenCalledTimes(2);
      expect(parts.sendToBackend.mock.calls[1][2]).toEqual(expect.objectContaining({skipInjection: true}));
      expect(parts.outbox.findByCorrelationKey('message-1:delete').type).toBe('operation-not-found');
      // The message was not shown again
      expect(parts.inject).not.toHaveBeenCalled();
    });

    it('during an attempt does not bring the message back when the attempt succeeds', async () => {
      parts.sendToBackend.mockRestore();
      seedMessage(parts, {messageId: 'message-1'});
      await startOutbox(parts);
      let finishSending: () => void = () => {
        return undefined;
      };
      parts.send.mockImplementationOnce(() => {
        return new Promise(resolve => {
          finishSending = () => {
            return resolve({id: 'message-1', sentAt: new Date(1_000_000).toISOString(), state: 'OUTGOING_SENT'});
          };
        });
      });
      parts.outbox.resume();
      await parts.clock.settle();
      expect(parts.send).toHaveBeenCalledTimes(1);

      await deleteForEveryone(createMessage(parts, 'message-1'));
      jest.spyOn(parts.conversation, 'getMessage').mockReturnValue(undefined);
      jest.spyOn(parts.eventService, 'loadEvent').mockResolvedValue(undefined);
      parts.updateEvent.mockClear();
      finishSending();
      await parts.clock.settle();

      expect(parts.outbox.findByCorrelationKey('message-1').type).toBe('operation-not-found');
      expect(parts.updateEvent).not.toHaveBeenCalled();
      expect(parts.inject).not.toHaveBeenCalled();
    });

    it('of a message that was sent goes to the lane of changes, and the message goes at once', async () => {
      await startOutbox(parts);

      await deleteForEveryone(createMessage(parts, 'sent-1', 'text', StatusType.SENT));

      expect(snapshotOf(parts.store, 'sent-1:delete')).toEqual(
        expect.objectContaining({kind: 'message-change', orderingKey: CHANGES_LANE}),
      );
      expect(parts.deleteEvent).toHaveBeenCalledWith(CONVERSATION_ID.id, 'sent-1');
    });

    it('for me, of a message that was sent, hides it in the lane of changes', async () => {
      await startOutbox(parts);

      await parts.repository.deleteMessage(parts.conversation, createMessage(parts, 'sent-1', 'text', StatusType.SENT));

      expect(snapshotOf(parts.store, 'sent-1:hide')).toEqual(
        expect.objectContaining({kind: 'message-change', orderingKey: CHANGES_LANE}),
      );
      expect(parts.deleteEvent).toHaveBeenCalledWith(CONVERSATION_ID.id, 'sent-1');
    });
  });
});
