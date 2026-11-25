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

import {createPendingMessageCount} from './createPendingMessageCount';
import type {MessagePayload} from './payloads';
import {assetPayload, deletePayload, editPayload, reactionPayload, textPayload, viewOf} from './testing/payloadFactories';

import type {OperationState} from '../../../outbox';

function track(
  count: ReturnType<typeof createPendingMessageCount>,
  id: string,
  payload: MessagePayload,
  state: OperationState,
): void {
  count.track(viewOf('message', payload, {id, state}));
}

describe('the pending message count', () => {
  it('counts text and file messages that wait, are on hold or are being sent', () => {
    const count = createPendingMessageCount();

    track(count, 'text', textPayload(), 'queued');
    track(count, 'asset', assetPayload(), 'on-hold');
    track(count, 'sending', textPayload({messageId: 'message-2'}), 'in-progress');

    expect(count.count()).toBe(3);
  });

  it('counts no reaction, edit or delete, whatever its state', () => {
    const count = createPendingMessageCount();

    track(count, 'reaction', reactionPayload(), 'queued');
    track(count, 'edit', editPayload(), 'queued');
    track(count, 'delete', deletePayload(), 'on-hold');

    expect(count.count()).toBe(0);
  });

  it('counts an operation once, however often it changes', () => {
    const count = createPendingMessageCount();

    track(count, 'text', textPayload(), 'queued');
    track(count, 'text', textPayload(), 'in-progress');
    track(count, 'text', textPayload(), 'queued');

    expect(count.count()).toBe(1);
  });

  it.each<OperationState>(['succeeded', 'dropped', 'dead-lettered'])('stops counting a message once it is %s', state => {
    const count = createPendingMessageCount();
    track(count, 'text', textPayload(), 'queued');

    track(count, 'text', textPayload(), state);

    expect(count.count()).toBe(0);
  });
});
