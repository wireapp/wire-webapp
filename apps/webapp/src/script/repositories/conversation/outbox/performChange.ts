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

import {messageCorrelationKey} from './keys';
import type {MessageOutboxPort, OutboxConversation} from './MessageOutboxPort';
import type {MessageChangePayload} from './payloads';
import {answerForSilentSend, attemptSend, dropBecauseConversationIsUnknown, runDetached} from './sendAnswers';
import type {SendingPermission} from './sendingPermission';

import {MessageTargetMode} from '../../../core/conversation';
import * as MessageBuilder from '../../../core/conversation/message/messageBuilder';
import type {PerformOutcome} from '../../../outbox';

/**
 * Sends a reaction, an edit, a deletion or a hide. The message of a change is never shown as failed:
 * one that can't go out, or that the user declines to send to a degraded conversation, is dropped and logged,
 * so the optimistic change stays local.
 */
export async function performChange<Conversation extends OutboxConversation>(
  kind: string,
  port: MessageOutboxPort<Conversation>,
  permission: SendingPermission<Conversation>,
  {payload, correlationKey = messageCorrelationKey(payload)}: {payload: MessageChangePayload; correlationKey?: string},
): Promise<PerformOutcome> {
  // A change to a message that is still being shown would find nothing to change
  await port.whenShown(payload.type === 'edit' ? payload.originalMessageId : payload.targetMessageId);

  if (payload.type === 'hide') {
    const hideMessage = MessageBuilder.buildHideMessage({
      conversationId: payload.conversationId.id,
      messageId: payload.targetMessageId,
      qualifiedConversationId: payload.conversationId,
    });
    return permission.performSelfSend(kind, correlationKey, hideMessage);
  }

  const conversation = port.findConversation(payload.conversationId);
  if (conversation === undefined) {
    return dropBecauseConversationIsUnknown(kind);
  }
  if (port.isDegraded(conversation)) {
    return permission.holdUntilAnswered({kind, correlationKey, conversations: [conversation]});
  }

  switch (payload.type) {
    case 'reaction': {
      const reaction = MessageBuilder.buildReactionMessage({
        originalMessageId: payload.targetMessageId,
        type: payload.reactions,
      });
      const answer = await attemptSend(() => {
        return port.sendToBackend(reaction, conversation, {failFast: true, skipInjection: true});
      });
      return answerForSilentSend(kind, answer);
    }
    case 'edit': {
      const edit = port.buildEdit(conversation, payload);
      const answer = await attemptSend(() => {
        return port.sendToBackend(edit, conversation, {failFast: true, syncTimestamp: false});
      });
      if (answer.type === 'sent') {
        runDetached(kind, () => {
          return port.sendLinkPreview(conversation, {
            messageId: payload.messageId,
            text: payload.text,
            mentions: payload.mentions,
            quote: undefined,
          });
        });
      }
      return answerForSilentSend(kind, answer);
    }
    case 'delete': {
      const deletion = MessageBuilder.buildDeleteMessage({messageId: payload.targetMessageId});
      const recipients = payload.recipients ?? port.recipientsOf(conversation);
      const answer = await attemptSend(() => {
        return port.sendToBackend(deletion, conversation, {
          failFast: true,
          recipients,
          skipInjection: true,
          targetMode: MessageTargetMode.USERS,
        });
      });
      return answerForSilentSend(kind, answer);
    }
  }
}
