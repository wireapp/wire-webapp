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

import type {GenericMessage} from '@wireapp/protocol-messaging';

import type {FailedReason} from './FailedReason';
import type {AssetMessagePayload, EditMessagePayload, TextMessagePayload} from './payloads';

import type {QualifiedId} from '../../../apiClient/user/qualifiedId';
import type {MessageTargetMode, SendResult} from '../../../core/conversation';

/** The kinds only pass a conversation back to the port: which one it is, is the app's business */
export type OutboxConversation = {readonly id: string};

export type MessageSendOptions = {
  nativePush?: boolean;
  recipients?: QualifiedId[];
  silentDegradationWarning?: boolean;
  /** For messages that have no record to mark as sent */
  skipInjection?: boolean;
  syncTimestamp?: boolean;
  targetMode?: MessageTargetMode;
};

/** What the kinds need to know about a message record */
export type MessageRecord = {
  isFailed: boolean;
  failedReason?: FailedReason;
  /** The bytes of an asset that wasn't sent yet */
  file?: Blob;
  /** An earlier attempt uploaded the asset and kept the result on the record */
  hasUploadResult: boolean;
};

export type MessageFailure = {
  reason: FailedReason;
  /** Shown as a federation error rather than as a plain failure */
  federation: boolean;
};

/**
 * Everything the message kinds need from the app, so that they never import `MessageRepository`.
 * Whatever it says about a conversation or a message may be stale by the time it is used.
 */
export type MessageOutboxPort<Conversation extends OutboxConversation> = {
  /** `undefined` when the conversation is gone, or its team is deleted */
  findConversation: (conversationId: QualifiedId) => Conversation | undefined;
  selfConversations: () => Conversation[];
  /** Everyone who gets a deletion for everyone */
  recipientsOf: (conversation: Conversation) => QualifiedId[];
  supportsReadReceipts: (conversation: Conversation) => boolean;
  isDegraded: (conversation: Conversation) => boolean;
  /** The conversation's draft is an edit of this message: its editor stays the owner of an edit that is on hold */
  isBeingEdited: (conversation: Conversation, messageId: string) => Promise<boolean>;
  /** Resolves `true` when the user agrees to send to the unverified devices; one prompt serves a conversation */
  requestSendingPermission: (conversation: Conversation) => Promise<boolean>;

  /** With what the conversation asks for now: mentions, quote hash, receipts, self-deleting timer */
  buildText: (conversation: Conversation, payload: TextMessagePayload) => Promise<GenericMessage>;
  buildEdit: (conversation: Conversation, payload: EditMessagePayload) => GenericMessage;
  /** With the id it was shown with, and the self-deleting timer */
  buildPing: (conversation: Conversation, messageId: string) => GenericMessage;
  /** From the upload result kept on the record; `undefined` when the record or the result is missing */
  buildAsset: (conversation: Conversation, payload: AssetMessagePayload) => Promise<GenericMessage | undefined>;

  /** Throws what the send throws; never marks the message failed */
  sendToBackend: (
    message: GenericMessage,
    conversation: Conversation,
    options?: MessageSendOptions,
  ) => Promise<SendResult>;
  /** Resolves when the message is no longer being shown for the first time, or at once when it isn't; never rejects */
  whenShown: (messageId: string) => Promise<void>;
  /** Resolves `false` when nothing was shown because there is no client id */
  injectOptimistic: (message: GenericMessage, conversation: Conversation) => Promise<boolean>;
  /** Uploads and keeps the result on the record; aborting the signal cancels the upload */
  uploadAsset: (
    conversation: Conversation,
    payload: AssetMessagePayload,
    file: Blob,
    signal: AbortSignal,
  ) => Promise<void>;
  /** After a send, the same as `sendTextWithLinkPreview` does: a preview replaces the sent message */
  sendLinkPreview: (
    conversation: Conversation,
    payload: Pick<TextMessagePayload, 'messageId' | 'text' | 'mentions' | 'quote'>,
  ) => Promise<void>;

  findMessage: (conversation: Conversation, messageId: string) => Promise<MessageRecord | undefined>;
  /** Back to sending, without a failure reason */
  markSending: (conversation: Conversation, messageId: string) => Promise<void>;
  markFailed: (conversation: Conversation, messageId: string, failure: MessageFailure) => Promise<void>;
  /** From the record and from the screen */
  deleteMessage: (conversation: Conversation, messageId: string) => Promise<void>;
};
