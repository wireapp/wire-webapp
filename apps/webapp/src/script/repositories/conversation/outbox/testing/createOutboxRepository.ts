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

import {GenericMessage} from '@wireapp/protocol-messaging';

import {CONVERSATION_PROTOCOL} from '../../../../apiClient/team/feature/featureList.types';
import {MessageSendingState, type SendResult} from '../../../../core/conversation';
import {MessageTimer} from '../../../../core/conversation/messageTimer/messageTimer';
import {StatusType} from '../../../../message/statusType';
import type {AttemptOutcome, Kind, KindHandle, OperationState, OperationView} from '../../../../outbox';
import {createOutboxTestKit, type OutboxTestKit} from '../../../../outbox/testing/createOutboxTestKit';
import {serverTimeHandler} from '../../../../time/serverTimeHandler';
import {createCoreTestFixture} from '../../../../util/test/createCoreTestFixture';
import {translateForTest} from '../../../../util/test/translateForTest';
import {AssetRepository} from '../../../assets/assetRepository';
import {AudioRepository} from '../../../audio/audioRepository';
import {ClientEntity} from '../../../client/ClientEntity';
import {ClientState} from '../../../client/ClientState';
import {CryptographyRepository} from '../../../cryptography/CryptographyRepository';
import {Conversation} from '../../../entity/Conversation';
import {User} from '../../../entity/User';
import {EventRepository} from '../../../event/EventRepository';
import {EventService} from '../../../event/EventService';
import {PropertiesRepository} from '../../../properties/propertiesRepository';
import type {EventRecord, StorageService} from '../../../storage';
import {TeamState} from '../../../team/TeamState';
import {UserRepository} from '../../../user/userRepository';
import {UserState} from '../../../user/userState';
import {ConversationRepository} from '../../ConversationRepository';
import {ConversationState} from '../../ConversationState';
import {ConversationVerificationState} from '../../ConversationVerificationState';
import {MessageRepository} from '../../MessageRepository';
import type {FailedReason} from '../FailedReason';
import type {MessageChangePayload, MessagePayload, PingPayload, ReceiptPayload} from '../messageOutboxTypes';

export const CONVERSATION_ID = {id: 'conversation-1', domain: 'wire.test'};
export const OTHER_CONVERSATION_ID = {id: 'conversation-2', domain: 'wire.test'};
export const MISSING_CONVERSATION_ID = {id: 'gone', domain: 'wire.test'};
export const MEMBER_ID = {id: 'member', domain: 'wire.test'};

export type StoredRecord = {
  status: StatusType;
  failed_reason?: FailedReason;
  fileData?: Blob;
  data?: Record<string, unknown>;
};

type PermissionPrompt = {conversation: Conversation; answer: (isAllowed: boolean) => Promise<void>};

type KindNames = {
  message: MessagePayload;
  'message-change': MessageChangePayload;
  ping: PingPayload;
  receipt: ReceiptPayload;
};

export type OutboxRepository = {
  repository: MessageRepository;
  /** Wait for what follows the operations with `waitUntilAllSettled` */
  invoker: FireAndForgetInvoker;
  kit: OutboxTestKit;
  conversation: Conversation;
  otherConversation: Conversation;
  selfConversation: Conversation;
  /** What `getSelfConversations` answers */
  selfConversations: Conversation[];
  /** By message id */
  records: Map<string, StoredRecord>;
  /** What the repository keeps in simple storage, by key */
  simpleStorage: Map<string, unknown>;
  /** The sending prompts asked so far. Each stays open until the test answers it. */
  prompts: PermissionPrompt[];
  handles: {[Name in keyof KindNames]: KindHandle<KindNames[Name]>};
  kinds: {[Name in keyof KindNames]: Kind<KindNames[Name]>};
  sendToBackend: jest.SpyInstance;
  injectOptimistic: jest.SpyInstance;
  markMessage: jest.SpyInstance;
  deleteMessage: jest.SpyInstance;
  uploadAsset: jest.SpyInstance;
  buildAsset: jest.SpyInstance;
  sendLinkPreview: jest.SpyInstance;
  degrade: (conversation: Conversation) => void;
  perform: <Name extends keyof KindNames>(
    name: Name,
    payload: KindNames[Name],
    signal?: AbortSignal,
  ) => Promise<AttemptOutcome>;
  changed: <Name extends keyof KindNames>(
    name: Name,
    payload: KindNames[Name],
    state: OperationState,
    queuedAt?: number,
  ) => Promise<void>;
};

export function sentResult(id = 'sent'): SendResult {
  return {id, sentAt: '2026-01-01T00:00:00.000Z', state: MessageSendingState.OUTGOING_SENT};
}

export function declinedResult(id = 'declined'): SendResult {
  return {id, sentAt: '2026-01-01T00:00:00.000Z', state: MessageSendingState.CANCELED};
}

export function sendingRecord(overrides: Partial<StoredRecord> = {}): StoredRecord {
  return {status: StatusType.SENDING, ...overrides};
}

export function uploadedRecord(overrides: Partial<StoredRecord> = {}): StoredRecord {
  return sendingRecord({
    data: {key: 'asset-key', otr_key: new Uint8Array([1]), sha256: new Uint8Array([1])},
    ...overrides,
  });
}

/** A storage service whose simple storage is `entries`, and that has nothing else */
export function createSimpleStorage(entries: Map<string, unknown>): StorageService {
  return {
    loadFromSimpleStorage: async (key: string) => {
      return entries.get(key);
    },
    saveToSimpleStorage: async (key: string, value: unknown) => {
      entries.set(key, value);
    },
  } as unknown as StorageService;
}

function createConversation({id, domain}: {id: string; domain: string}): Conversation {
  return new Conversation(id, domain, CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
}

/**
 * A message repository on a real outbox, with the event storage, the sends and the prompts faked at their
 * boundaries. The outbox is not started: call `kit.start()`.
 */
export function createOutboxRepository(): OutboxRepository {
  const kit = createOutboxTestKit();
  const register = jest.spyOn(kit.outbox, 'register');

  const selfUser = new User('selfid', '', translateForTest);
  selfUser.isMe = true;
  const userState = new UserState();
  userState.self(selfUser);
  const clientState = new ClientState();
  clientState.currentClient = new ClientEntity(true, '');
  const conversationState = new ConversationState(userState);
  const conversation = createConversation(CONVERSATION_ID);
  const otherConversation = createConversation(OTHER_CONVERSATION_ID);
  const selfConversation = createConversation({id: selfUser.id, domain: ''});
  conversationState.conversations([selfConversation, conversation, otherConversation]);
  const selfConversations = [selfConversation];
  jest.spyOn(conversationState, 'getSelfConversations').mockImplementation(() => {
    return selfConversations;
  });
  jest.spyOn(conversation, 'allUserEntities').mockReturnValue([{qualifiedId: MEMBER_ID} as User]);

  const records = new Map<string, StoredRecord>();
  const simpleStorage = new Map<string, unknown>();
  const eventService = new EventService(createSimpleStorage(simpleStorage));
  jest.spyOn(eventService, 'loadEvent').mockImplementation(async (_conversationId, messageId) => {
    const record = records.get(messageId);
    return record === undefined ? undefined : ({id: messageId, primary_key: messageId, ...record} as EventRecord);
  });
  jest.spyOn(eventService, 'updateEvent').mockImplementation(async (primaryKey, changes) => {
    const record = records.get(primaryKey);
    if (record !== undefined) {
      records.set(primaryKey, {...record, ...(changes as Partial<StoredRecord>)});
    }
    return {} as any;
  });
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
    userState,
    clientState,
    conversationState,
    new TeamState(),
    createCoreTestFixture({service: {conversation: {send: jest.fn(), messageTimer: new MessageTimer()}}}),
    kit.outbox,
    invoker,
  );

  const registered = new Map(
    register.mock.calls.map(([kind], index) => {
      const outcome = register.mock.results[index].value;
      return [kind.name, {kind, handle: outcome.outcome === 'kind-registered' ? outcome.handle : undefined}];
    }),
  );
  const kindNamed = (name: string): any => {
    return registered.get(name)?.kind;
  };
  const handleNamed = (name: string): any => {
    return registered.get(name)?.handle;
  };

  jest.spyOn(serverTimeHandler, 'toServerTimestamp').mockImplementation(kit.clock.getServerTime);
  const sendToBackend = jest.spyOn(repository as any, 'sendMessageToBackend').mockImplementation(async () => {
    return sentResult();
  });
  const injectOptimistic = jest
    .spyOn(repository as any, 'injectOptimisticMessage')
    .mockImplementation(async (message: any) => {
      const replacedId: string | undefined = (message as GenericMessage).edited?.replacingMessageId ?? undefined;
      const shown = records.get(replacedId ?? message.messageId) ?? sendingRecord();
      if (replacedId !== undefined) {
        records.delete(replacedId);
      }
      records.set(message.messageId, shown);
      return true;
    });
  const markMessage = jest
    .spyOn(repository as any, 'markMessage')
    .mockImplementation(async (_conversation, messageId: any, status: any, failedReason: any) => {
      const record = records.get(messageId);
      if (record !== undefined) {
        records.set(messageId, {...record, status, failed_reason: failedReason});
      }
    });
  const deleteMessage = jest
    .spyOn(repository, 'deleteMessageById')
    .mockImplementation(async (_conversation, messageId) => {
      records.delete(messageId);
      return 1;
    });
  const uploadAsset = jest
    .spyOn(repository as any, 'uploadOutboxAsset')
    .mockImplementation(async (_conversation, payload: any) => {
      const record = records.get(payload.messageId);
      if (record !== undefined) {
        records.set(payload.messageId, {...record, data: uploadedRecord().data});
      }
    });
  const buildAsset = jest
    .spyOn(repository as any, 'buildOutboxAsset')
    .mockImplementation(async (_conversation, payload: any) => {
      return new GenericMessage({messageId: payload.messageId});
    });
  jest.spyOn(repository as any, 'matchLocalTimerToSent').mockResolvedValue(undefined);
  const sendLinkPreview = jest.spyOn(repository as any, 'sendLinkPreviewOf').mockResolvedValue(undefined);

  const prompts: PermissionPrompt[] = [];
  jest.spyOn(repository, 'requestUserSendingPermission').mockImplementation(promptedConversation => {
    return new Promise<boolean>(resolve => {
      prompts.push({
        conversation: promptedConversation,
        answer: async isAllowed => {
          if (isAllowed) {
            promptedConversation.verification_state(ConversationVerificationState.UNVERIFIED);
          }
          resolve(isAllowed);
          await kit.clock.settle();
        },
      });
    });
  });

  function viewOf<Payload>(
    name: string,
    payload: Payload,
    overrides: Partial<OperationView<Payload>>,
  ): OperationView<Payload> {
    return {
      id: 'operation-1',
      kind: name,
      payload,
      correlation: {state: 'uncorrelated'},
      lane: {state: 'no-lane'},
      queuedAt: 0,
      state: 'in-progress',
      attempts: 1,
      ...overrides,
    };
  }

  return {
    repository,
    invoker,
    kit,
    conversation,
    otherConversation,
    selfConversation,
    selfConversations,
    records,
    simpleStorage,
    prompts,
    handles: {
      message: handleNamed('message'),
      'message-change': handleNamed('message-change'),
      ping: handleNamed('ping'),
      receipt: handleNamed('receipt'),
    },
    kinds: {
      message: kindNamed('message'),
      'message-change': kindNamed('message-change'),
      ping: kindNamed('ping'),
      receipt: kindNamed('receipt'),
    },
    sendToBackend,
    injectOptimistic,
    markMessage,
    deleteMessage,
    uploadAsset,
    buildAsset,
    sendLinkPreview,
    degrade: degradedConversation => {
      degradedConversation.verification_state(ConversationVerificationState.DEGRADED);
    },
    perform: (name, payload, signal = new AbortController().signal) => {
      return kindNamed(name).attempt(viewOf(name, payload, {}), signal);
    },
    changed: async (name, payload, state, queuedAt = 0) => {
      kindNamed(name).onChanged?.(viewOf(name, payload, {state, queuedAt}));
      await invoker.waitUntilAllSettled();
    },
  };
}
