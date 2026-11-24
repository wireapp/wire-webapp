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

import {classifySendError} from './classifySendError';
import {MINUTE_MILLISECONDS, WEEK_MILLISECONDS} from './durations';
import {messageCorrelationKey} from './keys';
import type {MessageOutboxPort, OutboxConversation} from './MessageOutboxPort';
import {parseMessagePayload, type AssetMessagePayload, type MessagePayload, type TextMessagePayload} from './payloads';
import {performChange} from './performChange';
import {attemptSend, dropBecauseConversationIsUnknown, outboxLogger, runDetached, type SendAnswer} from './sendAnswers';
import type {SendingPermission} from './sendingPermission';

import type {Kind, OperationView, PerformOutcome} from '../../../outbox';

export const KIND_NAME = 'message';
const performTimeoutMinutes = 2;
const PERFORM_TIMEOUT_MILLISECONDS = performTimeoutMinutes * MINUTE_MILLISECONDS;

/**
 * Messages, and the changes to a message that is still in the outbox, so that a change fails with its message.
 * A message that can't go out stays as failed, with Retry; its changes are dropped.
 */
export function createMessageKind<Conversation extends OutboxConversation>(
  port: MessageOutboxPort<Conversation>,
  permission: SendingPermission<Conversation>,
): Kind<MessagePayload> {
  /** A decline is recorded on the message, and its next attempt dead-letters it */
  function holdUntilAnswered(
    conversation: Conversation,
    payload: TextMessagePayload | AssetMessagePayload,
  ): PerformOutcome {
    return permission.holdUntilAnswered({
      kind: KIND_NAME,
      correlationKey: messageCorrelationKey(payload),
      conversations: [conversation],
      recordDecline: () => {
        return port.markFailed(conversation, payload.messageId, {reason: 'declined', federation: false});
      },
    });
  }

  async function answerForMessage(
    conversation: Conversation,
    messageId: string,
    answer: SendAnswer,
  ): Promise<PerformOutcome> {
    switch (answer.type) {
      case 'sent':
        return {type: 'attempt-succeeded'};
      case 'retry':
        return {type: 'attempt-failed'};
      case 'gone':
      case 'cancelled':
        outboxLogger.info('Dropping a message that can no longer be sent', {kind: KIND_NAME, outcome: answer.type});
        return {type: 'operation-dropped'};
      case 'declined':
        await port.markFailed(conversation, messageId, {reason: 'declined', federation: false});
        return {type: 'operation-dead-lettered'};
      case 'rejected':
        outboxLogger.info('A message was rejected', {kind: KIND_NAME, outcome: answer.reason});
        await port.markFailed(conversation, messageId, {reason: answer.reason, federation: answer.federation});
        return {type: 'operation-dead-lettered'};
    }
  }

  async function performText(payload: TextMessagePayload): Promise<PerformOutcome> {
    await port.whenShown(payload.messageId);
    const conversation = port.findConversation(payload.conversationId);
    if (conversation === undefined) {
      return dropBecauseConversationIsUnknown(KIND_NAME);
    }
    const record = await port.findMessage(conversation, payload.messageId);
    if (record?.failedReason === 'declined') {
      return {type: 'operation-dead-lettered'};
    }
    if (port.isDegraded(conversation)) {
      return holdUntilAnswered(conversation, payload);
    }

    const message = await port.buildText(conversation, payload);
    const answer = await attemptSend(() => {
      return port.sendToBackend(message, conversation, {syncTimestamp: true});
    });
    if (answer.type === 'sent') {
      runDetached(KIND_NAME, () => {
        return port.sendLinkPreview(conversation, payload);
      });
    }
    return answerForMessage(conversation, payload.messageId, answer);
  }

  async function performAsset(payload: AssetMessagePayload, signal: AbortSignal): Promise<PerformOutcome> {
    await port.whenShown(payload.messageId);
    const conversation = port.findConversation(payload.conversationId);
    if (conversation === undefined) {
      return dropBecauseConversationIsUnknown(KIND_NAME);
    }
    const record = await port.findMessage(conversation, payload.messageId);
    if (record === undefined) {
      // The bytes lived on the record: without it there is nothing to upload, and nothing to mark as failed
      outboxLogger.info('Dropping an asset without a record', {kind: KIND_NAME, outcome: 'record-missing'});
      return {type: 'operation-dropped'};
    }
    if (record.failedReason === 'declined') {
      return {type: 'operation-dead-lettered'};
    }
    if (port.isDegraded(conversation)) {
      return holdUntilAnswered(conversation, payload);
    }

    if (!record.hasUploadResult) {
      if (record.file === undefined) {
        return answerForMessage(conversation, payload.messageId, {
          type: 'rejected',
          reason: 'rejected',
          federation: false,
        });
      }
      try {
        await port.uploadAsset(conversation, payload, record.file, signal);
      } catch (error: unknown) {
        // An aborted attempt is not a cancelled upload: the timeout or the owner decided
        if (signal.aborted) {
          return {type: 'attempt-failed'};
        }
        return answerForMessage(conversation, payload.messageId, classifySendError(error));
      }
    }

    const message = await port.buildAsset(conversation, payload);
    if (message === undefined) {
      return answerForMessage(conversation, payload.messageId, {
        type: 'rejected',
        reason: 'rejected',
        federation: false,
      });
    }
    // The first injection of an asset message turns the shown placeholder into the uploaded asset
    await port.injectOptimistic(message, conversation);
    const answer = await attemptSend(() => {
      return port.sendToBackend(message, conversation, {syncTimestamp: true});
    });
    return answerForMessage(conversation, payload.messageId, answer);
  }

  /** Shows the message again when it is missing, and back as sending when it was retried */
  async function showAsSending(
    conversation: Conversation,
    payload: TextMessagePayload | AssetMessagePayload,
  ): Promise<void> {
    // The enqueue that queued the message shows it as well: looking before it is done would show the message twice
    await port.whenShown(payload.messageId);
    const record = await port.findMessage(conversation, payload.messageId);
    if (record === undefined) {
      if (payload.type === 'text') {
        await port.injectOptimistic(await port.buildText(conversation, payload), conversation);
      }
      return;
    }
    // A decline stays until its owner takes it back: it is what the next attempt acts on
    if (record.isFailed && record.failedReason !== 'declined') {
      await port.markSending(conversation, payload.messageId);
    }
  }

  async function showAsFailedUnlessItIs(
    conversation: Conversation,
    payload: TextMessagePayload | AssetMessagePayload,
  ): Promise<void> {
    const record = await port.findMessage(conversation, payload.messageId);
    if (record !== undefined && !record.isFailed) {
      await port.markFailed(conversation, payload.messageId, {reason: 'expired', federation: false});
    }
  }

  async function reactToChange({
    payload,
    state,
  }: OperationView<TextMessagePayload | AssetMessagePayload>): Promise<void> {
    const conversation = port.findConversation(payload.conversationId);
    if (conversation === undefined) {
      return;
    }
    switch (state) {
      case 'queued':
      case 'on-hold':
      case 'in-progress':
        return showAsSending(conversation, payload);
      case 'dead-lettered':
        return showAsFailedUnlessItIs(conversation, payload);
      case 'dropped':
        return port.deleteMessage(conversation, payload.messageId);
      case 'succeeded':
    }
  }

  return {
    name: KIND_NAME,
    parsePayload: parseMessagePayload,
    expiresAfterMilliseconds: WEEK_MILLISECONDS,
    performTimeoutMilliseconds: PERFORM_TIMEOUT_MILLISECONDS,
    // Only an expiry or a rejection ends a message, never the number of attempts
    maxAttempts: 1_000,
    whenGivenUp: 'dead-letter',
    laneWhenGivenUp: 'follows',
    perform: async ({payload, correlationKey}, signal) => {
      switch (payload.type) {
        case 'text':
          return performText(payload);
        case 'asset':
          return performAsset(payload, signal);
        case 'reaction':
        case 'edit':
        case 'delete':
          return performChange(KIND_NAME, port, permission, {payload, correlationKey});
      }
    },
    onChanged: operation => {
      const {payload} = operation;
      permission.followHold(operation.correlationKey ?? messageCorrelationKey(payload), operation.state);
      if (payload.type !== 'text' && payload.type !== 'asset') {
        return;
      }
      runDetached(KIND_NAME, () => {
        return reactToChange({...operation, payload});
      });
    },
  };
}
