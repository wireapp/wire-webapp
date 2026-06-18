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

import {renderHook, waitFor} from '@testing-library/react';

import {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {MediaStreamHandler} from 'Repositories/media/MediaStreamHandler';

import {useInitializeMediaDevices} from './useInitializeMediaDevices';

const createDevicesHandler = (initializeMediaDevices = jest.fn().mockResolvedValue(undefined)) =>
  ({
    initializeMediaDevices,
  }) as unknown as MediaDevicesHandler;

const createStreamHandler = (requestMediaStreamAccess = jest.fn().mockResolvedValue(undefined)) =>
  ({
    requestMediaStreamAccess,
  }) as unknown as MediaStreamHandler;

describe('useInitializeMediaDevices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests media access, stops received tracks and initializes media devices', async () => {
    const stop = jest.fn();
    const stream = {
      getTracks: jest.fn().mockReturnValue([{stop}]),
    } as unknown as MediaStream;

    const devicesHandler = createDevicesHandler();
    const streamHandler = createStreamHandler(jest.fn().mockResolvedValue(stream));

    const {result} = renderHook(() => useInitializeMediaDevices(devicesHandler, streamHandler));

    expect(result.current.areMediaDevicesInitialized).toBe(false);

    await waitFor(() => {
      expect(result.current.areMediaDevicesInitialized).toBe(true);
    });

    expect(streamHandler.requestMediaStreamAccess).toHaveBeenCalledWith(true);
    expect(stream.getTracks).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
    expect(devicesHandler.initializeMediaDevices).toHaveBeenCalledWith(true, true);
  });

  it('sets areMediaDevicesInitialized to true when media stream access fails', async () => {
    const devicesHandler = createDevicesHandler();
    const streamHandler = createStreamHandler(jest.fn().mockRejectedValue(new Error('Permission denied')));

    const {result} = renderHook(() => useInitializeMediaDevices(devicesHandler, streamHandler));

    expect(result.current.areMediaDevicesInitialized).toBe(false);

    await waitFor(() => {
      expect(result.current.areMediaDevicesInitialized).toBe(true);
    });

    expect(devicesHandler.initializeMediaDevices).not.toHaveBeenCalled();
  });

  it('sets areMediaDevicesInitialized to true when media devices initialization fails', async () => {
    const devicesHandler = createDevicesHandler(jest.fn().mockRejectedValue(new Error('Initialization failed')));
    const streamHandler = createStreamHandler();

    const {result} = renderHook(() => useInitializeMediaDevices(devicesHandler, streamHandler));

    expect(result.current.areMediaDevicesInitialized).toBe(false);

    await waitFor(() => {
      expect(result.current.areMediaDevicesInitialized).toBe(true);
    });

    expect(streamHandler.requestMediaStreamAccess).toHaveBeenCalledWith(true);
    expect(devicesHandler.initializeMediaDevices).toHaveBeenCalledWith(true, true);
  });
});
