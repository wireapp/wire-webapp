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

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FunctionComponent,
} from 'react';

import {Maybe, maybe} from 'true-myth';

import {
  createSharedDriveBackgroundMoveController,
  type BackgroundMoveObservation,
} from './sharedDriveBackgroundMoveController';
import type {DismissedUpload} from './sharedDriveUploadStatus';

export interface SharedDriveMoveItem {
  readonly id: string;
  readonly name: string;
  readonly isFolder: boolean;
}

export type SharedDriveBulkAction = 'move' | 'restore' | 'permanentDelete' | 'emptyBin';

export interface SharedDriveMoveSummary {
  readonly action: SharedDriveBulkAction;
  readonly items: readonly SharedDriveMoveItem[];
  readonly destinationPath: string;
}

export type SharedDriveMoveStatusKind =
  'processing' | 'completed' | 'request-failed' | 'partial' | 'finished-unknown' | 'failed' | 'status-unknown';

export interface SharedDriveMoveStatus extends SharedDriveMoveSummary {
  readonly id: string;
  readonly conversationQualifiedId: string;
  readonly kind: SharedDriveMoveStatusKind;
  /** Retries the check for an outcome that needs review; the popup offers it as a button when set. */
  readonly onReview?: () => void;
  /** True while the review is running; the popup disables its review button meanwhile. */
  readonly isReviewing?: boolean;
}

type SharedDriveUploadStatusContextValue = {
  readonly dismissedUpload: Maybe<DismissedUpload>;
  readonly dismissUpload: (upload: DismissedUpload) => void;
  readonly getMoveStatus: (conversationQualifiedId: string) => Maybe<SharedDriveMoveStatus>;
  readonly updateMoveStatus: (status: SharedDriveMoveStatus) => void;
  readonly createMoveStatusId: () => string;
  readonly dismissMoveStatus: (id: string) => void;
  readonly clearMoveStatus: (id: string) => void;
  readonly observeBackgroundMove: (observation: BackgroundMoveObservation) => void;
  readonly isProvided: boolean;
};

const SharedDriveUploadStatusContext = createContext<SharedDriveUploadStatusContextValue>({
  dismissedUpload: Maybe.nothing(),
  dismissUpload: () => {
    return undefined;
  },
  getMoveStatus: () => {
    return Maybe.nothing();
  },
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
  observeBackgroundMove: () => {
    return undefined;
  },
  isProvided: false,
});

interface SharedDriveUploadStatusProviderProps {
  readonly children: ReactNode;
  readonly initialDismissedUpload?: Maybe<DismissedUpload>;
  readonly initialMoveStatus?: Maybe<SharedDriveMoveStatus>;
  readonly resetOnScopeChange?: Maybe<string>;
}

export const SharedDriveUploadStatusProvider: FunctionComponent<SharedDriveUploadStatusProviderProps> = ({
  children,
  initialDismissedUpload = Maybe.nothing(),
  initialMoveStatus = Maybe.nothing(),
  resetOnScopeChange = Maybe.nothing(),
}: SharedDriveUploadStatusProviderProps) => {
  const [dismissedUpload, setDismissedUpload] = useState<Maybe<DismissedUpload>>(initialDismissedUpload);
  const [moveStatuses, setMoveStatuses] = useState<ReadonlyMap<string, SharedDriveMoveStatus>>(() => {
    return maybe.isJust(initialMoveStatus)
      ? new Map([[initialMoveStatus.value.conversationQualifiedId, initialMoveStatus.value]])
      : new Map();
  });
  const getMoveStatus = (conversationQualifiedId: string): Maybe<SharedDriveMoveStatus> => {
    return Maybe.of(moveStatuses.get(conversationQualifiedId));
  };
  const moveStatusSequence = useRef(0);
  const createMoveStatusId = useCallback(() => {
    moveStatusSequence.current += 1;
    return `shared-drive-move-${moveStatusSequence.current}`;
  }, []);
  const dismissedMoveStatusIds = useRef(new Set<string>());
  const updateMoveStatus = useCallback((status: SharedDriveMoveStatus) => {
    if (dismissedMoveStatusIds.current.has(status.id)) {
      return;
    }
    setMoveStatuses(current => {
      return new Map(current).set(status.conversationQualifiedId, status);
    });
  }, []);
  const [backgroundMoveController] = useState(() => {
    return createSharedDriveBackgroundMoveController(updateMoveStatus);
  });
  const previousScopeKey = useRef(resetOnScopeChange);
  useEffect(() => {
    const previous = previousScopeKey.current;
    previousScopeKey.current = resetOnScopeChange;
    if (
      maybe.isNothing(previous) ||
      maybe.isNothing(resetOnScopeChange) ||
      previous.value === resetOnScopeChange.value
    ) {
      return;
    }
    backgroundMoveController.stopAll();
    dismissedMoveStatusIds.current.clear();
    setDismissedUpload(Maybe.nothing());
    setMoveStatuses(new Map());
  }, [backgroundMoveController, resetOnScopeChange]);
  useEffect(() => {
    return backgroundMoveController.stopAll;
  }, [backgroundMoveController]);
  const dismissMoveStatus = useCallback((id: string) => {
    dismissedMoveStatusIds.current.add(id);
    setMoveStatuses(current => {
      const next = new Map(current);
      for (const [conversationQualifiedId, status] of next) {
        if (status.id === id) {
          next.delete(conversationQualifiedId);
        }
      }
      return next;
    });
  }, []);
  const clearMoveStatus = useCallback((id: string) => {
    setMoveStatuses(current => {
      const next = new Map(current);
      for (const [conversationQualifiedId, status] of next) {
        if (status.id === id) {
          next.delete(conversationQualifiedId);
        }
      }
      return next;
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
        getMoveStatus,
        updateMoveStatus,
        createMoveStatusId,
        dismissMoveStatus,
        clearMoveStatus,
        observeBackgroundMove: backgroundMoveController.start,
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

export const SharedDriveUploadStatusScope: FunctionComponent<{
  readonly enabled: boolean;
  readonly scopeKey: Maybe<string>;
  readonly children: ReactNode;
}> = ({enabled, scopeKey, children}) => {
  return enabled ? (
    <SharedDriveUploadStatusProvider resetOnScopeChange={scopeKey}>{children}</SharedDriveUploadStatusProvider>
  ) : (
    <>{children}</>
  );
};
