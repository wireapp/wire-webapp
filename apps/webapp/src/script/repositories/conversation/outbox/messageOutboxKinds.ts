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

import {createMessageChangeKind} from './createMessageChangeKind';
import {createMessageKind} from './createMessageKind';
import {createPendingMessageCount} from './createPendingMessageCount';
import {createPingKind} from './createPingKind';
import {createReceiptKind} from './createReceiptKind';
import type {MessageOutboxPort, OutboxConversation} from './MessageOutboxPort';
import type {MessageChangePayload, MessagePayload, PingPayload, ReceiptPayload} from './payloads';
import {createRestoredHoldsReview} from './reviewRestoredHolds';
import {createSendingPermission, type HoldsTracker} from './sendingPermission';

import type {Kind, KindHandle, Outbox} from '../../../outbox';

export type MessageOutboxHandles<Conversation extends OutboxConversation = OutboxConversation> = {
  message: KindHandle<MessagePayload>;
  messageChange: KindHandle<MessageChangePayload>;
  receipt: KindHandle<ReceiptPayload>;
  ping: KindHandle<PingPayload>;
  /** The text and file messages that still have to go out */
  countPendingMessages: () => number;
  /** Whoever holds an operation outside a prompt registers it here first, see `HoldsTracker` */
  holds: HoldsTracker;
  /** For when the user opens a conversation, see `createRestoredHoldsReview` */
  reviewRestoredHolds: (conversation: Conversation) => Promise<void>;
};

function registerKind<Payload>(outbox: Outbox, kind: Kind<Payload>): KindHandle<Payload> {
  const registered = outbox.register(kind);
  if (registered.type !== 'kind-registered') {
    throw new Error(`Can't register the '${kind.name}' outbox kind: ${registered.type}`);
  }
  return registered.handle;
}

/** Before the outbox starts; throws when a kind can't be registered, which is a wiring bug */
export function registerMessageOutboxKinds<Conversation extends OutboxConversation>(
  outbox: Outbox,
  port: MessageOutboxPort<Conversation>,
): MessageOutboxHandles<Conversation> {
  const permission = createSendingPermission(outbox, port);
  const pendingMessages = createPendingMessageCount();
  const messageKind = createMessageKind(port, permission);
  return {
    message: registerKind(outbox, {
      ...messageKind,
      onChanged: operation => {
        pendingMessages.track(operation);
        messageKind.onChanged?.(operation);
      },
    }),
    countPendingMessages: pendingMessages.count,
    messageChange: registerKind(outbox, createMessageChangeKind(port, permission)),
    receipt: registerKind(outbox, createReceiptKind(port, permission)),
    ping: registerKind(outbox, createPingKind(port, permission)),
    holds: permission.holds,
    reviewRestoredHolds: createRestoredHoldsReview(outbox, port, permission),
  };
}
