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

import {Message} from 'Repositories/entity/message/Message';
import {useAppMainState} from 'src/script/page/state';

import {COMPOSER_FOCUS_EVENT, THREAD_PANEL_INTERACTION_EVENT} from './threadRootHighlightEvents';
import {useActiveThreadRootHighlightId} from './useActiveThreadRootHighlightId';

describe('useActiveThreadRootHighlightId', () => {
  beforeEach(() => {
    useAppMainState.getState().rightSidebar.close();
    useAppMainState.getState().conversationThread.close();
  });

  it('returns null when no main-pane thread is active', () => {
    const {result} = renderHook(() => useActiveThreadRootHighlightId());
    expect(result.current).toBeNull();
  });

  it('suspends and restores highlight based on explicit focus events', () => {
    const rootMessage = new Message('root-message-id');
    act(() => {
      useAppMainState.getState().conversationThread.open(rootMessage);
    });

    const {result} = renderHook(() => useActiveThreadRootHighlightId());
    expect(result.current).toBe('root-message-id');

    act(() => {
      window.dispatchEvent(new CustomEvent(COMPOSER_FOCUS_EVENT, {detail: {scope: 'main'}}));
    });
    expect(result.current).toBeNull();

    act(() => {
      window.dispatchEvent(new CustomEvent(THREAD_PANEL_INTERACTION_EVENT));
    });
    expect(result.current).toBe('root-message-id');
  });
});
