/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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
import {EventName} from 'Repositories/tracking/EventName';

import {WebAppEvents} from '@wireapp/webapp-events';

import {useCameraReloadOnCallEnd} from './useCameraReloadOnCallEnd';

jest.mock('amplify');

describe('useCameraReloadOnCallEnd', () => {
  const mockCallingRepository = {
    hasActiveCall: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with camera reload state set to false', () => {
    const {result} = renderHook(() => useCameraReloadOnCallEnd(mockCallingRepository as any));

    expect(result.current.shouldReloadCamera).toBe(false);
    expect(amplify.subscribe).toHaveBeenCalledWith(WebAppEvents.ANALYTICS.EVENT, expect.any(Function));
  });

  it('should toggle camera reload state when call ends and no active call exists', () => {
    mockCallingRepository.hasActiveCall.mockReturnValue(false);

    const {result} = renderHook(() => useCameraReloadOnCallEnd(mockCallingRepository as any));

    const subscribeCall = (amplify.subscribe as jest.Mock).mock.calls[0];
    const eventHandler = subscribeCall[1];

    expect(result.current.shouldReloadCamera).toBe(false);

    act(() => {
      eventHandler(EventName.CALLING.ENDED_CALL);
    });

    expect(result.current.shouldReloadCamera).toBe(true);
    expect(mockCallingRepository.hasActiveCall).toHaveBeenCalled();
  });

  it('should not toggle camera reload state when event is not ENDED_CALL', () => {
    mockCallingRepository.hasActiveCall.mockReturnValue(false);

    const {result} = renderHook(() => useCameraReloadOnCallEnd(mockCallingRepository as any));

    const subscribeCall = (amplify.subscribe as jest.Mock).mock.calls[0];
    const eventHandler = subscribeCall[1];

    act(() => {
      eventHandler('SOME_OTHER_EVENT');
    });

    expect(result.current.shouldReloadCamera).toBe(false);
    expect(mockCallingRepository.hasActiveCall).not.toHaveBeenCalled();
  });

  it('should not toggle camera reload state when there is an active call', () => {
    mockCallingRepository.hasActiveCall.mockReturnValue(true);

    const {result} = renderHook(() => useCameraReloadOnCallEnd(mockCallingRepository as any));

    const subscribeCall = (amplify.subscribe as jest.Mock).mock.calls[0];
    const eventHandler = subscribeCall[1];

    act(() => {
      eventHandler(EventName.CALLING.ENDED_CALL);
    });

    expect(result.current.shouldReloadCamera).toBe(false);
    expect(mockCallingRepository.hasActiveCall).toHaveBeenCalled();
  });

  it('should unsubscribe from events on unmount', () => {
    const {unmount} = renderHook(() => useCameraReloadOnCallEnd(mockCallingRepository as any));

    unmount();

    expect(amplify.unsubscribe).toHaveBeenCalledWith(WebAppEvents.ANALYTICS.EVENT, expect.any(Function));
  });
});
