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
import type {Data as OpenGraphResult} from 'open-graph';

import {CONVERSATION_PROTOCOL} from '../../../../apiClient/team/feature/featureList.types';
import {Config} from '../../../../Config';
import {MessageSendingState, type SendResult} from '../../../../core/conversation';
import {MessageTimer} from '../../../../core/conversation/messageTimer/messageTimer';
import type {EncryptedAssetUploaded} from '../../../../core/cryptography/assetCryptography/encryptedAsset';
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
/** A member of the conversation, and the sender of the messages a receipt confirms */
export const SENDER_ID = {id: 'sender', domain: 'wire.test'};
/** When a stored message was written */
export const WRITTEN_AT = '2025-12-31T23:59:00.000Z';
/** When the backend answers that a message was sent */
export const SENT_AT = '2026-01-01T00:00:00.000Z';

const SELF_USER_ID = 'selfid';

/** The fields of an event record that the tests read and write */
export type StoredRecord = {
  type?: string;
  conversation?: string;
  from?: string;
  time?: string;
  written_time?: string;
  status?: StatusType;
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
  selfUser: User;
  /** Wait for what follows the operations with `waitUntilAllSettled` */
  invoker: FireAndForgetInvoker;
  kit: OutboxTestKit;
  conversation: Conversation;
  otherConversation: Conversation;
  selfConversation: Conversation;
  /** What `getSelfConversations` answers */
  selfConversations: Conversation[];
  eventService: EventService;
  audioRepository: AudioRepository;
  /** The event storage, by message id */
  records: Map<string, StoredRecord>;
  /** What the repository keeps in simple storage, by key */
  simpleStorage: Map<string, unknown>;
  /** The sending prompts asked so far. Each stays open until the test answers it. */
  prompts: PermissionPrompt[];
  handles: {[Name in keyof KindNames]: KindHandle<KindNames[Name]>};
  kinds: {[Name in keyof KindNames]: Kind<KindNames[Name]>};
  /** The send of the core, which answers `sentResult()` unless told otherwise */
  send: jest.Mock;
  /** The events shown in the conversation; the event storage keeps them, as the event repository does */
  injectEvent: jest.SpyInstance;
  loadEvent: jest.SpyInstance;
  updateEvent: jest.SpyInstance;
  deleteEvent: jest.SpyInstance;
  /** The public `deleteMessageById`, which removes the record */
  deleteMessage: jest.SpyInstance;
  /** The upload of the asset repository, which answers `uploadedAsset()` */
  uploadFile: jest.Mock;
  cancelUpload: jest.Mock;
  /** Looks up the link of a text for its preview, and finds nothing unless told otherwise */
  openGraph: jest.Mock<Promise<OpenGraphResult | undefined>, [string]>;
  uploadLinkPreviewImage: jest.Mock;
  /** The client mismatch handler, which the repository also calls after every send that went through */
  clientMismatch: jest.Mock;
  degrade: (conversation: Conversation) => void;
  attempt: <Name extends keyof KindNames>(
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

export function sentResult(id = 'sent', sentAt = SENT_AT): SendResult {
  return {id, sentAt, state: MessageSendingState.OUTGOING_SENT};
}

export function declinedResult(id = 'declined'): SendResult {
  return {id, sentAt: SENT_AT, state: MessageSendingState.CANCELED};
}

/** A text the user wrote, shown as sending */
export function sendingRecord(overrides: StoredRecord = {}): StoredRecord {
  return {
    type: 'conversation.message-add',
    conversation: CONVERSATION_ID.id,
    from: SELF_USER_ID,
    time: WRITTEN_AT,
    status: StatusType.SENDING,
    data: {content: 'hello', mentions: [], previews: []},
    ...overrides,
  } as StoredRecord;
}

export function uploadedAsset(): EncryptedAssetUploaded {
  return {
    cipherText: new Uint8Array(),
    domain: 'wire.test',
    key: 'asset-key',
    keyBytes: new Uint8Array([1]),
    sha256: new Uint8Array([1]),
    token: 'token',
  };
}

/** The bytes of an asset. The Blob of jsdom can't be read, and the message of an uploaded asset carries its bytes. */
export function assetBytes(): Blob {
  const content = 'bytes';
  return Object.assign(new Blob([content]), {
    arrayBuffer: async () => {
      return new TextEncoder().encode(content).buffer;
    },
  });
}

/** An asset with its bytes, whose upload an earlier attempt finished */
export function uploadedRecord(overrides: StoredRecord = {}): StoredRecord {
  const {domain, key, keyBytes, sha256, token} = uploadedAsset();
  return sendingRecord({
    data: {content: 'notes.txt', mentions: [], previews: [], domain, key, otr_key: keyBytes, sha256, token},
    fileData: assetBytes(),
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

function createMember({id, domain}: {id: string; domain: string}): User {
  const member = new User(id, domain, translateForTest);
  member.devices([new ClientEntity(false, domain, `${id}-client`)]);
  return member;
}

/**
 * The event storage of the event service, as the records of `records`. A record is loaded with its id as its
 * primary key, and an edit is found by the id of the message it replaced as well.
 */
function fakeEventStorage(
  eventService: EventService,
  records: Map<string, StoredRecord>,
): Record<'loadEvent' | 'updateEvent' | 'deleteEvent', jest.SpyInstance> {
  const loadEvent = jest.spyOn(eventService, 'loadEvent').mockImplementation(async (_conversationId, messageId) => {
    const editId = [...records.keys()].find(recordId => {
      return records.get(recordId)?.data?.replacing_message_id === messageId;
    });
    const id = records.has(messageId) ? messageId : editId;
    return id === undefined ? undefined : ({...records.get(id), id, primary_key: id} as EventRecord);
  });
  const updateEvent = jest.spyOn(eventService, 'updateEvent').mockImplementation(async (primaryKey, changes) => {
    const record = records.get(primaryKey);
    if (record !== undefined) {
      records.set(primaryKey, {...record, ...(changes as StoredRecord)});
    }
    return {} as any;
  });
  const deleteEvent = jest.spyOn(eventService, 'deleteEvent').mockImplementation(async (_conversationId, messageId) => {
    return records.delete(messageId) ? 1 : 0;
  });
  return {loadEvent, updateEvent, deleteEvent};
}

/**
 * What the event repository keeps of an injected event: an edit takes the place of the message it replaces, a
 * reaction changes the message it reacts to, and an event with the id of a record updates that record.
 */
function keepInjectedEvent(records: Map<string, StoredRecord>, event: StoredRecord & {id: string}): void {
  if (event.type === 'conversation.reaction') {
    return;
  }
  const replacedId = event.data?.replacing_message_id as string | undefined;
  const replaced = replacedId === undefined ? undefined : records.get(replacedId);
  if (replacedId !== undefined) {
    records.delete(replacedId);
  }
  records.set(event.id, {...replaced, ...records.get(event.id), ...event});
}

/**
 * A message repository on a real outbox, with the event storage, the core, the asset repository, the link preview
 * lookup and the sending prompts faked at their boundaries. The outbox is not started: call `kit.start()`.
 */
export function createOutboxRepository({maxOperations}: {maxOperations?: number} = {}): OutboxRepository {
  const kit = createOutboxTestKit({maxOperations});
  const register = jest.spyOn(kit.outbox, 'register');

  const selfUser = new User(SELF_USER_ID, '', translateForTest);
  selfUser.isMe = true;
  const userState = new UserState();
  userState.self(selfUser);
  const clientState = new ClientState();
  clientState.currentClient = new ClientEntity(true, '', 'self-client');
  const conversationState = new ConversationState(userState);
  const conversation = createConversation(CONVERSATION_ID);
  const otherConversation = createConversation(OTHER_CONVERSATION_ID);
  const selfConversation = createConversation({id: selfUser.id, domain: ''});
  conversationState.conversations([selfConversation, conversation, otherConversation]);
  const selfConversations = [selfConversation];
  jest.spyOn(conversationState, 'getSelfConversations').mockImplementation(() => {
    return selfConversations;
  });
  jest.spyOn(conversation, 'allUserEntities').mockReturnValue([createMember(MEMBER_ID), createMember(SENDER_ID)]);

  const records = new Map<string, StoredRecord>();
  const simpleStorage = new Map<string, unknown>();
  const eventService = new EventService(createSimpleStorage(simpleStorage));
  const {loadEvent, updateEvent, deleteEvent} = fakeEventStorage(eventService, records);
  const eventRepository = new EventRepository(eventService, {} as any, {} as any, {} as any);
  const injectEvent = jest.spyOn(eventRepository, 'injectEvent').mockImplementation(async event => {
    keepInjectedEvent(records, event as StoredRecord & {id: string});
  });

  const propertiesRepository = new PropertiesRepository({} as any, {} as any, translateForTest);
  jest.spyOn(propertiesRepository, 'getPreference').mockReturnValue(true);
  const config = Config.getConfig();
  jest.spyOn(Config, 'getConfig').mockReturnValue({...config, FEATURE: {...config.FEATURE, ALLOW_LINK_PREVIEWS: true}});
  const openGraph = jest.fn<Promise<OpenGraphResult | undefined>, [string]>().mockResolvedValue(undefined);
  window.openGraphAsync = openGraph as (url: string) => Promise<OpenGraphResult>;
  const uploadLinkPreviewImage = jest.fn();

  const uploadFile = jest.fn().mockImplementation(async () => {
    return uploadedAsset();
  });
  const cancelUpload = jest.fn();
  const assetRepository = {uploadFile, cancelUpload, getAssetRetention: jest.fn()} as unknown as AssetRepository;

  const audioRepository = new AudioRepository();
  jest.spyOn(audioRepository, 'play').mockResolvedValue(undefined as never);
  const send = jest.fn().mockImplementation(async () => {
    return sentResult();
  });
  const invoker = createFireAndForgetInvoker({reportError: jest.fn()});

  const repository = new MessageRepository(
    () => {
      return {checkMessageTimer: jest.fn()} as unknown as ConversationRepository;
    },
    new CryptographyRepository({} as any),
    eventRepository,
    propertiesRepository,
    serverTimeHandler,
    {} as UserRepository,
    assetRepository,
    audioRepository,
    translateForTest,
    kit.outbox,
    userState,
    clientState,
    conversationState,
    new TeamState(),
    createCoreTestFixture({
      service: {conversation: {send, messageTimer: new MessageTimer()}, linkPreview: {uploadLinkPreviewImage}},
    }),
    invoker,
  );
  const clientMismatch = jest.fn().mockResolvedValue(true);
  repository.setClientMismatchHandler(clientMismatch);

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
  const deleteMessage = jest.spyOn(repository, 'deleteMessageById');

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
    selfUser,
    invoker,
    kit,
    conversation,
    otherConversation,
    selfConversation,
    selfConversations,
    eventService,
    audioRepository,
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
    send,
    injectEvent,
    loadEvent,
    updateEvent,
    deleteEvent,
    deleteMessage,
    uploadFile,
    cancelUpload,
    openGraph,
    uploadLinkPreviewImage,
    clientMismatch,
    degrade: degradedConversation => {
      degradedConversation.verification_state(ConversationVerificationState.DEGRADED);
    },
    attempt: (name, payload, signal = new AbortController().signal) => {
      return kindNamed(name).attempt(viewOf(name, payload, {}), signal);
    },
    changed: async (name, payload, state, queuedAt = 0) => {
      kindNamed(name).onChanged?.(viewOf(name, payload, {state, queuedAt}));
      await invoker.waitUntilAllSettled();
    },
  };
}
