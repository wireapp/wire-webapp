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

import {useMeetingNotificationHostElement} from './useMeetingNotificationHostElement';

describe('useMeetingNotificationTarget', () => {
  it('uses wire-main as the fallback target', () => {
    const wireMain = document.createElement('div');
    const {result} = renderHook(() => useMeetingNotificationHostElement(wireMain));

    expect(result.current.meetingNotificationHostElement).toBe(wireMain);
  });

  it('prefers the conversations target and falls back to wire-main', () => {
    const conversations = document.createElement('div');
    const wireMain = document.createElement('div');

    const {result} = renderHook(() => useMeetingNotificationHostElement(wireMain));

    expect(result.current.meetingNotificationHostElement).toBe(wireMain);

    act(() => result.current.setMeetingNotificationHostElement(conversations));
    expect(result.current.meetingNotificationHostElement).toBe(conversations);

    act(() => result.current.setMeetingNotificationHostElement(null));
    expect(result.current.meetingNotificationHostElement).toBe(wireMain);
  });

  it('does not discover a fallback target from the document', () => {
    const wireMain = document.createElement('div');
    const {result} = renderHook(() => useMeetingNotificationHostElement(null));

    document.body.append(wireMain);

    expect(result.current.meetingNotificationHostElement).toBeNull();
  });
});
