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
import {amplify} from 'amplify';

import {useMessageEditing} from './useMessageEditing';

import {ContentMessage} from '../../../../repositories/entity/message/contentMessage';
import {translateForTest} from '../../../../util/test/translateForTest';
import {WebAppEvents} from '../../../../webAppEvents';

describe('useMessageEditing', () => {
  const message = new ContentMessage('message-1', translateForTest);
  const messageRepository = {
    startEditing: jest.fn().mockResolvedValue(undefined),
    stopEditing: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    messageRepository.startEditing.mockClear();
    messageRepository.stopEditing.mockClear();
  });

  it('starts editing on the edit event, and tells the message repository', () => {
    const {result} = renderHook(() => {
      return useMessageEditing({messageRepository});
    });

    act(() => {
      amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.EDIT, message);
    });

    expect(result.current.editedMessage).toBe(message);
    expect(result.current.isEditing).toBe(true);
    expect(messageRepository.startEditing).toHaveBeenCalledWith(message);
  });

  it('tells the message repository when the edit is cancelled, and stops editing', () => {
    const callback = jest.fn();
    const {result} = renderHook(() => {
      return useMessageEditing({messageRepository});
    });
    act(() => {
      result.current.editMessage(message);
    });

    act(() => {
      result.current.cancelMessageEditing(callback);
    });

    expect(messageRepository.stopEditing).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(result.current.isEditing).toBe(false);
  });
});
