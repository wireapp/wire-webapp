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

import type {MessagePayload} from './payloads';

import type {OperationView} from '../../../outbox';

export type PendingMessageCount = {
  /** Feed it every `onChanged` of the message kind, which the outbox also calls for the operations it loads */
  track: (operation: OperationView<MessagePayload>) => void;
  /** The text and file messages that still have to go out; failed ones, and changes and pings, are not counted */
  count: () => number;
};

export function createPendingMessageCount(): PendingMessageCount {
  const waiting = new Set<string>();

  return {
    track: ({id, payload, state}) => {
      const isMessage = payload.type === 'text' || payload.type === 'asset';
      const isWaiting = state === 'queued' || state === 'on-hold' || state === 'in-progress';
      if (isMessage && isWaiting) {
        waiting.add(id);
      } else {
        waiting.delete(id);
      }
    },
    count: () => {
      return waiting.size;
    },
  };
}
