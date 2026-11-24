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

import {Confirmation} from '@wireapp/protocol-messaging';

import {MINUTE_MILLISECONDS, WEEK_MILLISECONDS} from './durations';
import {receiptCorrelationKey} from './keys';
import type {MessageOutboxPort, OutboxConversation} from './MessageOutboxPort';
import {parseReceiptPayload, type ReceiptPayload} from './payloads';
import {answerForSilentSend, attemptSend, dropBecauseConversationIsUnknown, outboxLogger} from './sendAnswers';
import type {SendingPermission} from './sendingPermission';

import {MessageTargetMode} from '../../../core/conversation';
import * as MessageBuilder from '../../../core/conversation/message/messageBuilder';
import type {Kind, PerformOutcome} from '../../../outbox';

export const KIND_NAME = 'receipt';

type ConfirmationPayload = Extract<ReceiptPayload, {type: 'confirmation'}>;

/**
 * Delivery and read confirmations, last read, cleared and the tracking id sync. Nothing here is ever shown,
 * and what can't go out is forgotten. A confirmation never asks the user about a degraded conversation; what goes
 * to the self conversations does, when one of them is degraded.
 */
export function createReceiptKind<Conversation extends OutboxConversation>(
  port: MessageOutboxPort<Conversation>,
  permission: SendingPermission<Conversation>,
): Kind<ReceiptPayload> {
  async function performConfirmation(payload: ConfirmationPayload): Promise<PerformOutcome> {
    const conversation = port.findConversation(payload.conversationId);
    if (conversation === undefined) {
      return dropBecauseConversationIsUnknown(KIND_NAME);
    }
    // The user may have turned read receipts off since it was queued
    if (payload.confirmationType === Confirmation.Type.READ && !port.supportsReadReceipts(conversation)) {
      outboxLogger.info('Dropping a read receipt', {kind: KIND_NAME, outcome: 'read-receipts-off'});
      return {type: 'operation-dropped'};
    }

    const [firstMessageId, ...moreMessageIds] = payload.messageIds;
    const confirmation = MessageBuilder.buildConfirmationMessage({
      firstMessageId,
      moreMessageIds: moreMessageIds.length > 0 ? moreMessageIds : undefined,
      type: payload.confirmationType,
    });
    const options = {
      nativePush: false,
      recipients: [payload.recipient],
      silentDegradationWarning: true,
      skipInjection: true,
    };

    let answer = await attemptSend(() => {
      return port.sendToBackend(confirmation, conversation, {...options, targetMode: MessageTargetMode.USERS});
    });
    if (answer.type === 'declined') {
      // Refused over unverified devices: send to the devices we know of only
      answer = await attemptSend(() => {
        return port.sendToBackend(confirmation, conversation, {
          ...options,
          targetMode: MessageTargetMode.USERS_CLIENTS,
        });
      });
    }
    return answerForSilentSend(KIND_NAME, answer);
  }

  return {
    name: KIND_NAME,
    parsePayload: parseReceiptPayload,
    expiresAfterMilliseconds: WEEK_MILLISECONDS,
    performTimeoutMilliseconds: MINUTE_MILLISECONDS,
    maxAttempts: 100,
    whenGivenUp: 'drop',
    laneWhenGivenUp: 'continues',
    perform: async ({payload, correlationKey = receiptCorrelationKey(payload)}) => {
      switch (payload.type) {
        case 'confirmation':
          return performConfirmation(payload);
        case 'last-read': {
          const lastRead = MessageBuilder.buildLastReadMessage(payload.conversationId, payload.timestamp);
          return permission.performSelfSend(KIND_NAME, correlationKey, lastRead);
        }
        case 'cleared': {
          const cleared = MessageBuilder.buildClearedMessage(payload.conversationId, payload.timestamp);
          return permission.performSelfSend(KIND_NAME, correlationKey, cleared);
        }
        case 'data-transfer': {
          const dataTransfer = MessageBuilder.buildDataTransferMessage(payload.countlyId);
          return permission.performSelfSend(KIND_NAME, correlationKey, dataTransfer);
        }
      }
    },
    onChanged: ({payload, correlationKey = receiptCorrelationKey(payload), state}) => {
      permission.followHold(correlationKey, state);
    },
  };
}
