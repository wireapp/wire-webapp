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

import {createContext, type ReactNode, useContext} from 'react';

import type {SharedDriveUploadController} from './sharedDriveUploadController';

const SharedDriveUploadContext = createContext<SharedDriveUploadController | null>(null);

interface SharedDriveUploadProviderProps {
  readonly children: ReactNode;
  readonly controller: SharedDriveUploadController;
}

export const SharedDriveUploadProvider = ({children, controller}: SharedDriveUploadProviderProps) => {
  return <SharedDriveUploadContext.Provider value={controller}>{children}</SharedDriveUploadContext.Provider>;
};

export const useSharedDriveUploadController = (): SharedDriveUploadController => {
  const controller = useContext(SharedDriveUploadContext);

  if (!controller) {
    throw new Error('useSharedDriveUploadController must be used within a SharedDriveUploadProvider');
  }

  return controller;
};
