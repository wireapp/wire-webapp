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

import {act, renderHook, waitFor} from '@testing-library/react';

import {useMeetingNotificationHostElement} from './useMeetingNotificationHostElement';

describe('useMeetingNotificationTarget', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="wire-main"></div>';
  });

  it('uses wire-main as the fallback target', async () => {
    const {result} = renderHook(() => useMeetingNotificationHostElement());

    await waitFor(() =>
      expect(result.current.meetingNotificationHostElement).toBe(document.getElementById('wire-main')),
    );
  });

  it('prefers the conversations target and falls back to wire-main', async () => {
    const conversations = document.createElement('div');
    conversations.id = 'conversations';
    document.body.append(conversations);

    const {result} = renderHook(() => useMeetingNotificationHostElement());
    await waitFor(() =>
      expect(result.current.meetingNotificationHostElement).toBe(document.getElementById('wire-main')),
    );

    act(() => result.current.setMeetingNotificationHostElement(conversations));
    expect(result.current.meetingNotificationHostElement).toBe(conversations);

    act(() => result.current.setMeetingNotificationHostElement(null));
    expect(result.current.meetingNotificationHostElement).toBe(document.getElementById('wire-main'));
  });

  it('tracks wire-main when it mounts after the hook', async () => {
    document.body.innerHTML = '';
    const {result} = renderHook(() => useMeetingNotificationHostElement());

    act(() => {
      const wireMain = document.createElement('div');
      wireMain.id = 'wire-main';
      document.body.append(wireMain);
    });

    await waitFor(() =>
      expect(result.current.meetingNotificationHostElement).toBe(document.getElementById('wire-main')),
    );
  });
});
