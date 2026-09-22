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

import {createContext, type ReactNode, useCallback, useContext, useState} from 'react';

import {Maybe} from 'true-myth';

import type {DismissedUpload} from './sharedDriveUploadStatus';

type SharedDriveUploadStatusContextValue = {
  readonly dismissedUpload: Maybe<DismissedUpload>;
  readonly dismissUpload: (upload: DismissedUpload) => void;
  readonly isProvided: boolean;
};

const SharedDriveUploadStatusContext = createContext<SharedDriveUploadStatusContextValue>({
  dismissedUpload: Maybe.nothing(),
  dismissUpload: () => undefined,
  isProvided: false,
});

interface SharedDriveUploadStatusProviderProps {
  readonly children: ReactNode;
  readonly initialDismissedUpload?: Maybe<DismissedUpload>;
}

export const SharedDriveUploadStatusProvider = ({
  children,
  initialDismissedUpload = Maybe.nothing(),
}: SharedDriveUploadStatusProviderProps) => {
  const [dismissedUpload, setDismissedUpload] = useState<Maybe<DismissedUpload>>(initialDismissedUpload);
  const dismissUpload = useCallback((upload: DismissedUpload) => setDismissedUpload(Maybe.just(upload)), []);

  return (
    <SharedDriveUploadStatusContext.Provider value={{dismissedUpload, dismissUpload, isProvided: true}}>
      {children}
    </SharedDriveUploadStatusContext.Provider>
  );
};

export const useSharedDriveUploadStatus = (): SharedDriveUploadStatusContextValue => {
  return useContext(SharedDriveUploadStatusContext);
};
