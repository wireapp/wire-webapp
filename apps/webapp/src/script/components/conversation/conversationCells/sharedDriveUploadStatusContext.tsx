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

import {createContext, type ReactNode, useCallback, useContext, useRef, useState, type FunctionComponent} from 'react';

import {Maybe, maybe} from 'true-myth';

import type {DismissedUpload} from './sharedDriveUploadStatus';

export interface SharedDriveMoveItem {
  readonly id: string;
  readonly name: string;
  readonly isFolder: boolean;
}

export interface SharedDriveMoveSummary {
  readonly items: readonly SharedDriveMoveItem[];
  readonly destinationPath: string;
}

export type SharedDriveMoveStatusKind =
  'processing' | 'completed' | 'request-failed' | 'partial' | 'finished-unknown' | 'failed' | 'status-unknown';

export interface SharedDriveMoveStatus extends SharedDriveMoveSummary {
  readonly id: string;
  readonly kind: SharedDriveMoveStatusKind;
}

type SharedDriveUploadStatusContextValue = {
  readonly dismissedUpload: Maybe<DismissedUpload>;
  readonly dismissUpload: (upload: DismissedUpload) => void;
  readonly moveStatus: Maybe<SharedDriveMoveStatus>;
  readonly updateMoveStatus: (status: SharedDriveMoveStatus) => void;
  readonly createMoveStatusId: () => string;
  readonly dismissMoveStatus: (id: string) => void;
  readonly clearMoveStatus: (id: string) => void;
  readonly isProvided: boolean;
};

const SharedDriveUploadStatusContext = createContext<SharedDriveUploadStatusContextValue>({
  dismissedUpload: Maybe.nothing(),
  dismissUpload: () => {
    return undefined;
  },
  moveStatus: Maybe.nothing(),
  updateMoveStatus: () => {
    return undefined;
  },
  createMoveStatusId: () => {
    return 'shared-drive-move-1';
  },
  dismissMoveStatus: () => {
    return undefined;
  },
  clearMoveStatus: () => {
    return undefined;
  },
  isProvided: false,
});

interface SharedDriveUploadStatusProviderProps {
  readonly children: ReactNode;
  readonly initialDismissedUpload?: Maybe<DismissedUpload>;
  readonly initialMoveStatus?: Maybe<SharedDriveMoveStatus>;
}

export const SharedDriveUploadStatusProvider: FunctionComponent<SharedDriveUploadStatusProviderProps> = ({
  children,
  initialDismissedUpload = Maybe.nothing(),
  initialMoveStatus = Maybe.nothing(),
}: SharedDriveUploadStatusProviderProps) => {
  const [dismissedUpload, setDismissedUpload] = useState<Maybe<DismissedUpload>>(initialDismissedUpload);
  const [moveStatus, setMoveStatus] = useState<Maybe<SharedDriveMoveStatus>>(initialMoveStatus);
  const moveStatusSequence = useRef(0);
  const createMoveStatusId = useCallback(() => {
    moveStatusSequence.current += 1;
    return `shared-drive-move-${moveStatusSequence.current}`;
  }, []);
  const dismissedMoveStatusId = useRef<Maybe<string>>(Maybe.nothing());
  const updateMoveStatus = useCallback((status: SharedDriveMoveStatus) => {
    if (maybe.isJust(dismissedMoveStatusId.current)) {
      if (dismissedMoveStatusId.current.value === status.id) {
        return;
      }
      dismissedMoveStatusId.current = Maybe.nothing();
    }
    setMoveStatus(Maybe.just(status));
  }, []);
  const dismissMoveStatus = useCallback((id: string) => {
    dismissedMoveStatusId.current = Maybe.just(id);
    setMoveStatus(current => {
      return maybe.isJust(current) && current.value.id === id ? Maybe.nothing() : current;
    });
  }, []);
  const clearMoveStatus = useCallback((id: string) => {
    setMoveStatus(current => {
      return maybe.isJust(current) && current.value.id === id ? Maybe.nothing() : current;
    });
  }, []);
  const dismissUpload = useCallback((upload: DismissedUpload) => {
    return setDismissedUpload(Maybe.just(upload));
  }, []);

  return (
    <SharedDriveUploadStatusContext.Provider
      value={{
        dismissedUpload,
        dismissUpload,
        moveStatus,
        updateMoveStatus,
        createMoveStatusId,
        dismissMoveStatus,
        clearMoveStatus,
        isProvided: true,
      }}
    >
      {children}
    </SharedDriveUploadStatusContext.Provider>
  );
};

export const useSharedDriveUploadStatus = (): SharedDriveUploadStatusContextValue => {
  return useContext(SharedDriveUploadStatusContext);
};
