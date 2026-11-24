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

import {MINUTE_MILLISECONDS, WEEK_MILLISECONDS} from './durations';
import {messageCorrelationKey} from './keys';
import type {MessageOutboxPort, OutboxConversation} from './MessageOutboxPort';
import {parseMessageChangePayload, type MessageChangePayload} from './payloads';
import {performChange} from './performChange';
import type {SendingPermission} from './sendingPermission';

import type {Kind} from '../../../outbox';

export const KIND_NAME = 'message-change';
const performTimeoutMinutes = 2;
const PERFORM_TIMEOUT_MILLISECONDS = performTimeoutMinutes * MINUTE_MILLISECONDS;

/**
 * Reaction, edit, deletion and hide of a message that was sent. They have a lane of their own,
 * so they never wait behind messages that are pending, and nothing is shown when one can't go out.
 */
export function createMessageChangeKind<Conversation extends OutboxConversation>(
  port: MessageOutboxPort<Conversation>,
  permission: SendingPermission<Conversation>,
): Kind<MessageChangePayload> {
  return {
    name: KIND_NAME,
    parsePayload: parseMessageChangePayload,
    expiresAfterMilliseconds: WEEK_MILLISECONDS,
    performTimeoutMilliseconds: PERFORM_TIMEOUT_MILLISECONDS,
    maxAttempts: 1_000,
    whenGivenUp: 'drop',
    laneWhenGivenUp: 'continues',
    perform: async ({payload, correlationKey}) => {
      return performChange(KIND_NAME, port, permission, {payload, correlationKey});
    },
    onChanged: ({payload, correlationKey = messageCorrelationKey(payload), state}) => {
      permission.followHold(correlationKey, state);
    },
  };
}
