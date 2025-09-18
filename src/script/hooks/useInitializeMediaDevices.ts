/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {useCallback, useEffect, useState} from 'react';

import {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {MediaStreamHandler} from 'Repositories/media/MediaStreamHandler';
import {getLogger} from 'Util/Logger';

const logger = getLogger('useInitializeMediaDevices');

export const useInitializeMediaDevices = (devicesHandler: MediaDevicesHandler, streamHandler: MediaStreamHandler) => {
  const [areMediaDevicesInitialized, setAreMediaDevicesInitialized] = useState(false);

  const initializeMediaDevices = useCallback(async () => {
    try {
      const stream = await streamHandler.requestMediaStreamAccess(true);
      await devicesHandler?.initializeMediaDevices();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setAreMediaDevicesInitialized(true);
    } catch (error) {
      logger.warn(`Initialization of media devices failed:`, error);
      setAreMediaDevicesInitialized(false);
    }
  }, [devicesHandler, streamHandler]);

  useEffect(() => {
    initializeMediaDevices();
  }, [initializeMediaDevices]);

  return {areMediaDevicesInitialized};
};
