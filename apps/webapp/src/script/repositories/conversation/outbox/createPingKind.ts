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

import {MINUTE_MILLISECONDS, SECOND_MILLISECONDS} from './durations';
import type {MessageOutboxPort, OutboxConversation} from './MessageOutboxPort';
import {parsePingPayload, type PingPayload} from './payloads';
import {answerForSilentSend, attemptSend, dropBecauseConversationIsUnknown, runDetached} from './sendAnswers';
import type {SendingPermission} from './sendingPermission';

import type {Kind} from '../../../outbox';

export const KIND_NAME = 'ping';
const performTimeoutSeconds = 10;
const PERFORM_TIMEOUT_MILLISECONDS = performTimeoutSeconds * SECOND_MILLISECONDS;

/** A ping that is late is pointless: it is forgotten, and takes its message off the screen */
export function createPingKind<Conversation extends OutboxConversation>(
  port: MessageOutboxPort<Conversation>,
  permission: SendingPermission<Conversation>,
): Kind<PingPayload> {
  return {
    name: KIND_NAME,
    parsePayload: parsePingPayload,
    expiresAfterMilliseconds: MINUTE_MILLISECONDS,
    performTimeoutMilliseconds: PERFORM_TIMEOUT_MILLISECONDS,
    maxAttempts: 3,
    whenGivenUp: 'drop',
    // The pings behind a ping that was given up carry on: only messages cascade
    laneWhenGivenUp: 'continues',
    perform: async ({payload, correlationKey = payload.messageId}) => {
      await port.whenShown(payload.messageId);
      const conversation = port.findConversation(payload.conversationId);
      if (conversation === undefined) {
        return dropBecauseConversationIsUnknown(KIND_NAME);
      }
      if (port.isDegraded(conversation)) {
        // A declined ping is dropped like any ping that can't go out, and leaves the screen with it
        return permission.holdUntilAnswered({kind: KIND_NAME, correlationKey, conversations: [conversation]});
      }
      const ping = port.buildPing(conversation, payload.messageId);
      const answer = await attemptSend(() => {
        return port.sendToBackend(ping, conversation, {syncTimestamp: true});
      });
      return answerForSilentSend(KIND_NAME, answer);
    },
    onChanged: ({payload, correlationKey = payload.messageId, state}) => {
      permission.followHold(correlationKey, state);
      if (state !== 'dropped') {
        return;
      }
      runDetached(KIND_NAME, async () => {
        const conversation = port.findConversation(payload.conversationId);
        if (conversation !== undefined) {
          await port.deleteMessage(conversation, payload.messageId);
        }
      });
    },
  };
}
