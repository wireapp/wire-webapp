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

import {asyncNoop} from 'noop-esm';

import {GenericMessage} from '@wireapp/protocol-messaging';

import {MessageSendingState} from '../../../../core/conversation';
import * as MessageBuilder from '../../../../core/conversation/message/messageBuilder';
import type {MessageOutboxPort, MessageRecord} from '../MessageOutboxPort';

export const CONVERSATION_ID = {id: 'conversation-1', domain: 'wire.test'};
export const OTHER_CONVERSATION_ID = {id: 'conversation-2', domain: 'wire.test'};

export type FakeConversation = {readonly id: string};

type FakePort = MessageOutboxPort<FakeConversation>;

export type FakeMessageOutboxPort = {
  [Name in keyof FakePort]: jest.MockedFunction<FakePort[Name]>;
};

type PermissionPrompt = {conversation: FakeConversation; answer: (accepted: boolean) => Promise<void>};

export type FakeMessageOutbox = {
  port: FakeMessageOutboxPort;
  conversation: FakeConversation;
  otherConversation: FakeConversation;
  selfConversation: FakeConversation;
  /** What the port knows about the messages, by message id */
  records: Map<string, MessageRecord>;
  /** The conversations that are degraded */
  degraded: Set<FakeConversation>;
  /** The ids of the messages the conversations' drafts edit */
  edited: Map<FakeConversation, Set<string>>;
  /** The prompts asked so far; each stays open until the test answers it */
  prompts: PermissionPrompt[];
};

/** A mock that may ignore the arguments it doesn't need */
function mockOf<Name extends keyof FakePort>(implementation: FakePort[Name]): FakeMessageOutboxPort[Name] {
  return jest.fn(implementation as (...args: never[]) => unknown) as unknown as FakeMessageOutboxPort[Name];
}

export function sentResult(id = 'sent'): Awaited<ReturnType<FakePort['sendToBackend']>> {
  return {id, sentAt: '2026-01-01T00:00:00.000Z', state: MessageSendingState.OUTGOING_SENT};
}

export function declinedResult(id = 'declined'): Awaited<ReturnType<FakePort['sendToBackend']>> {
  return {id, sentAt: '2026-01-01T00:00:00.000Z', state: MessageSendingState.CANCELED};
}

/** `settle` lets the work that follows a prompt's answer run: the kinds release the operation after `perform` returned */
export function createFakeMessageOutboxPort(settle: () => Promise<void>): FakeMessageOutbox {
  const conversation: FakeConversation = {id: CONVERSATION_ID.id};
  const otherConversation: FakeConversation = {id: OTHER_CONVERSATION_ID.id};
  const selfConversation: FakeConversation = {id: 'self'};
  const conversations = [conversation, otherConversation];
  const records = new Map<string, MessageRecord>();
  const degraded = new Set<FakeConversation>();
  const edited = new Map<FakeConversation, Set<string>>();
  const prompts: PermissionPrompt[] = [];

  const port: FakeMessageOutboxPort = {
    findConversation: jest.fn(({id}) => {
      return conversations.find(candidate => {
        return candidate.id === id;
      });
    }),
    selfConversations: jest.fn(() => {
      return [selfConversation];
    }),
    recipientsOf: mockOf<'recipientsOf'>(() => {
      return [{id: 'member', domain: 'wire.test'}];
    }),
    supportsReadReceipts: mockOf<'supportsReadReceipts'>(() => {
      return true;
    }),
    isDegraded: jest.fn(candidate => {
      return degraded.has(candidate);
    }),
    isBeingEdited: jest.fn(async (candidate, messageId) => {
      return edited.get(candidate)?.has(messageId) === true;
    }),
    requestSendingPermission: jest.fn(candidate => {
      return new Promise<boolean>(resolve => {
        prompts.push({
          conversation: candidate,
          answer: async accepted => {
            if (accepted) {
              degraded.delete(candidate);
            }
            resolve(accepted);
            await settle();
          },
        });
      });
    }),
    buildText: jest.fn(async (_conversation, payload) => {
      return MessageBuilder.buildTextMessage({text: payload.text}, payload.messageId);
    }),
    buildEdit: jest.fn((_conversation, payload) => {
      return MessageBuilder.buildEditedTextMessage(
        {originalMessageId: payload.originalMessageId, text: payload.text},
        payload.messageId,
      );
    }),
    buildPing: jest.fn((_conversation, messageId) => {
      const ping = MessageBuilder.buildPingMessage({expectsReadConfirmation: false, hotKnock: false});
      ping.messageId = messageId;
      return ping;
    }),
    buildAsset: jest.fn(async (_conversation, payload) => {
      return records.get(payload.messageId)?.hasUploadResult === true
        ? new GenericMessage({messageId: payload.messageId})
        : undefined;
    }),
    sendToBackend: mockOf<'sendToBackend'>(async () => {
      return sentResult();
    }),
    whenShown: mockOf<'whenShown'>(asyncNoop),
    injectOptimistic: mockOf<'injectOptimistic'>(async () => {
      return true;
    }),
    uploadAsset: mockOf<'uploadAsset'>(async (_conversation, payload) => {
      const record = records.get(payload.messageId);
      if (record !== undefined) {
        records.set(payload.messageId, {...record, hasUploadResult: true});
      }
    }),
    sendLinkPreview: mockOf<'sendLinkPreview'>(asyncNoop),
    findMessage: jest.fn(async (_conversation, messageId) => {
      return records.get(messageId);
    }),
    markSending: jest.fn(async (_conversation, messageId) => {
      const record = records.get(messageId);
      if (record !== undefined) {
        records.set(messageId, {...record, isFailed: false, failedReason: undefined});
      }
    }),
    markFailed: jest.fn(async (_conversation, messageId, {reason}) => {
      const record = records.get(messageId);
      if (record !== undefined) {
        records.set(messageId, {...record, isFailed: true, failedReason: reason});
      }
    }),
    deleteMessage: jest.fn(async (_conversation, messageId) => {
      records.delete(messageId);
    }),
  };

  return {port, conversation, otherConversation, selfConversation, records, degraded, edited, prompts};
}

export function sendingRecord(overrides: Partial<MessageRecord> = {}): MessageRecord {
  return {isFailed: false, hasUploadResult: false, ...overrides};
}
