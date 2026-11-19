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
  createSharedDriveBackgroundActionController,
  type BackgroundActionObservation,
  type BackgroundMoveOperation,
} from './sharedDriveBackgroundActionController';
import type {SharedDriveMoveStatus} from './sharedDriveMoveStatus';
import type {DismissedUpload} from './sharedDriveUploadStatus';

export type {
  SharedDriveBulkAction,
  SharedDriveMoveItem,
  SharedDriveMoveStatus,
  SharedDriveMoveStatusKind,
  SharedDriveMoveSummary,
} from './sharedDriveMoveStatus';

type SharedDriveUploadStatusContextValue = {
  readonly dismissedUpload: Maybe<DismissedUpload>;
  readonly dismissUpload: (upload: DismissedUpload) => void;
  readonly getMoveStatus: (conversationQualifiedId: string) => Maybe<SharedDriveMoveStatus>;
  readonly startMoveStatus: (status: SharedDriveMoveStatus) => void;
  readonly tryStartMove: (status: SharedDriveMoveStatus) => boolean;
  readonly finishMove: (id: string) => void;
  readonly isMoveActive: boolean;
  readonly isMoveStatusCurrent: (conversationQualifiedId: string, id: string) => boolean;
  readonly updateMoveStatus: (status: SharedDriveMoveStatus) => void;
  readonly createMoveStatusId: () => string;
  readonly getMoveOperation: (id: string) => BackgroundMoveOperation | undefined;
  readonly setMoveJobUuids: (id: string, jobUuids: readonly string[]) => void;
  readonly dismissMoveStatus: (id: string) => void;
  readonly clearMoveStatus: (id: string) => void;
  readonly observeBackgroundAction: (observation: BackgroundActionObservation) => void;
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
  startMoveStatus: () => {
    return undefined;
  },
  tryStartMove: () => {
    return false;
  },
  finishMove: () => {
    return undefined;
  },
  isMoveActive: false,
  isMoveStatusCurrent: () => {
    return false;
  },
  updateMoveStatus: () => {
    return undefined;
  },
  createMoveStatusId: () => {
    return 'shared-drive-move-1';
  },
  getMoveOperation: () => {
    return undefined;
  },
  setMoveJobUuids: () => {
    return undefined;
  },
  dismissMoveStatus: () => {
    return undefined;
  },
  clearMoveStatus: () => {
    return undefined;
  },
  observeBackgroundAction: () => {
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

interface CurrentMove {
  readonly id: string;
  readonly scopeKey: Maybe<string>;
}

const sameScope = (first: Maybe<string>, second: Maybe<string>): boolean => {
  return maybe.isNothing(first) ? maybe.isNothing(second) : maybe.isJust(second) && first.value === second.value;
};

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
  const currentScopeKey = useRef(resetOnScopeChange);
  currentScopeKey.current = resetOnScopeChange;
  const currentMoveIds = useRef(
    new Map<string, CurrentMove>(
      maybe.isJust(initialMoveStatus)
        ? [
            [
              initialMoveStatus.value.conversationQualifiedId,
              {id: initialMoveStatus.value.id, scopeKey: resetOnScopeChange},
            ],
          ]
        : [],
    ),
  );
  const moveId = useRef<Maybe<string>>(Maybe.nothing());
  const [activeMoveId, setActiveMoveId] = useState<Maybe<string>>(Maybe.nothing());
  const getMoveStatus = (conversationQualifiedId: string): Maybe<SharedDriveMoveStatus> => {
    return Maybe.of(moveStatuses.get(conversationQualifiedId));
  };
  const moveStatusSequence = useRef(0);
  const createMoveStatusId = useCallback(() => {
    moveStatusSequence.current += 1;
    return `shared-drive-move-${moveStatusSequence.current}`;
  }, []);
  const dismissedMoveStatusIds = useRef(new Set<string>());
  const isMoveStatusCurrent = useCallback((conversationQualifiedId: string, id: string): boolean => {
    const current = currentMoveIds.current.get(conversationQualifiedId);
    return current !== undefined && current.id === id && sameScope(current.scopeKey, currentScopeKey.current);
  }, []);
  const updateMoveStatus = useCallback(
    (status: SharedDriveMoveStatus) => {
      if (
        dismissedMoveStatusIds.current.has(status.id) ||
        !isMoveStatusCurrent(status.conversationQualifiedId, status.id)
      ) {
        return;
      }
      setMoveStatuses(current => {
        if (!isMoveStatusCurrent(status.conversationQualifiedId, status.id)) {
          return current;
        }
        return new Map(current).set(status.conversationQualifiedId, status);
      });
    },
    [isMoveStatusCurrent],
  );
  const [backgroundActionController] = useState(() => {
    return createSharedDriveBackgroundActionController(updateMoveStatus);
  });
  const startMoveStatus = useCallback(
    (status: SharedDriveMoveStatus) => {
      currentMoveIds.current.set(status.conversationQualifiedId, {id: status.id, scopeKey: currentScopeKey.current});
      backgroundActionController.register(status);
      setMoveStatuses(current => {
        return new Map(current).set(status.conversationQualifiedId, status);
      });
    },
    [backgroundActionController],
  );
  const tryStartMove = useCallback(
    (status: SharedDriveMoveStatus): boolean => {
      if (maybe.isJust(moveId.current)) {
        return false;
      }
      moveId.current = Maybe.just(status.id);
      setActiveMoveId(Maybe.just(status.id));
      startMoveStatus(status);
      return true;
    },
    [startMoveStatus],
  );
  const finishMove = useCallback((id: string): void => {
    if (maybe.isNothing(moveId.current) || moveId.current.value !== id) {
      return;
    }
    moveId.current = Maybe.nothing();
    setActiveMoveId(Maybe.nothing());
  }, []);
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
    backgroundActionController.stopAll();
    currentMoveIds.current.clear();
    dismissedMoveStatusIds.current.clear();
    moveId.current = Maybe.nothing();
    setActiveMoveId(Maybe.nothing());
    setMoveStatuses(new Map());
  }, [backgroundActionController, resetOnScopeChange]);
  useEffect(() => {
    return backgroundActionController.stopAll;
  }, [backgroundActionController]);
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
  const clearMoveStatus = useCallback(
    (id: string) => {
      finishMove(id);
      for (const [conversationQualifiedId, current] of currentMoveIds.current) {
        if (current.id === id) {
          currentMoveIds.current.delete(conversationQualifiedId);
        }
      }
      setMoveStatuses(current => {
        const next = new Map(current);
        for (const [conversationQualifiedId, status] of next) {
          if (status.id === id) {
            next.delete(conversationQualifiedId);
          }
        }
        return next;
      });
    },
    [finishMove],
  );
  const dismissUpload = useCallback((upload: DismissedUpload) => {
    return setDismissedUpload(Maybe.just(upload));
  }, []);

  return (
    <SharedDriveUploadStatusContext.Provider
      value={{
        dismissedUpload,
        dismissUpload,
        getMoveStatus,
        startMoveStatus,
        tryStartMove,
        finishMove,
        isMoveActive: maybe.isJust(activeMoveId),
        isMoveStatusCurrent,
        updateMoveStatus,
        createMoveStatusId,
        getMoveOperation: backgroundActionController.get,
        setMoveJobUuids: backgroundActionController.setJobUuids,
        dismissMoveStatus,
        clearMoveStatus,
        observeBackgroundAction: observation => {
          const operation = backgroundActionController.get(observation.status.id);
          if (
            operation !== undefined &&
            isMoveStatusCurrent(operation.status.conversationQualifiedId, observation.status.id)
          ) {
            backgroundActionController.start(observation);
          }
        },
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
