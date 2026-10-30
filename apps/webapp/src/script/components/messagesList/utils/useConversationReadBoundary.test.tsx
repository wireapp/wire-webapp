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

import {act, renderHook} from '@testing-library/react';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import {Conversation} from 'Repositories/entity/Conversation';
import {Message} from 'Repositories/entity/message/message';
import {translateForTest} from 'Util/test/translateForTest';

import {useConversationReadBoundary} from './useConversationReadBoundary';

describe('useConversationReadBoundary', () => {
  it('keeps automatic read progress from moving the separator and updates it for an explicit marker', () => {
    const conversation = new Conversation('conversation', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
    conversation.last_read_timestamp(100);
    const {result} = renderHook(() => {
      return useConversationReadBoundary(conversation);
    });

    act(() => {
      conversation.setTimestamp(105, Conversation.TIMESTAMP_TYPE.LAST_READ);
    });

    expect(result.current.timestamp).toBe(100);

    const selectedMessage = new Message('selected-message', undefined, translateForTest);
    selectedMessage.timestamp(105);

    act(() => {
      conversation.markUnreadFrom(selectedMessage);
    });

    expect(result.current.timestamp).toBe(104);
    expect(result.current.timestampReference.current).toBe(104);

    act(() => {
      conversation.clearManualUnreadMarker();
    });

    expect(result.current.timestamp).toBe(105);
  });
});
