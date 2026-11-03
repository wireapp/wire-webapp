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

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import type {Clock} from '@enormora/clock/clock';
import type {QualifiedId} from '@wireapp/api-client/lib/user/';

import type {BinOperation} from './cellsBinOperationController';
import {isBinOperationLocked, useCellsBinOperation} from './cellsBinOperationsContext';

interface BinOperationViewOptions {
  readonly drive: QualifiedId;
  readonly path: string;
  readonly clock: Clock;
  readonly onRefresh: () => Promise<boolean>;
  readonly onAcknowledged?: (operation: BinOperation) => void;
  readonly isCurrentScope: () => boolean;
  readonly visibleNodeIds?: readonly string[];
  readonly isNodesLoading?: boolean;
}

const VIEW_REFRESH_TIMEOUT_MS = 20_000;
const PERMANENT_DELETE_REFRESH_INTERVAL_MS = 1000;

type BinOperationView = ReturnType<typeof useCellsBinOperation> & {
  readonly isLocked: boolean;
  readonly isRefreshing: boolean;
  readonly refreshFailed: boolean;
  readonly refreshTimedOut: boolean;
  readonly refreshReview: () => Promise<void>;
};

/** Views own their reads, never the mutation or its background-job lifetime. */
export function useCellsBinOperationView(options: BinOperationViewOptions): BinOperationView {
  const {drive: inputDrive, path, clock} = options;
  const drive = useMemo(() => {
    return {id: inputDrive.id, domain: inputDrive.domain};
  }, [inputDrive.id, inputDrive.domain]);
  const {controller, operation} = useCellsBinOperation(drive);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const scope = JSON.stringify([drive.domain, drive.id, path]);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const generation = useRef(0);
  const inFlight = useRef(false);
  const activeTimeout = useRef<ReturnType<Clock['setTimeout']> | undefined>(undefined);
  const lastSuccessfulRefresh = useRef<number | undefined>(undefined);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [refreshTimedOut, setRefreshTimedOut] = useState(false);
  const operationId = operation?.id;
  const operationState = operation?.state;
  const needsRefresh = operation?.needsRefresh;
  const matchesPath = operation?.path === path;

  const refresh = useCallback(async (): Promise<void> => {
    if (
      operationId === undefined ||
      !matchesPath ||
      inFlight.current ||
      scopeRef.current !== scope ||
      controller.getSnapshot(drive)?.id !== operationId ||
      !optionsRef.current.isCurrentScope()
    ) {
      return;
    }
    const currentGeneration = generation.current;
    const isCurrent = (): boolean => {
      return (
        generation.current === currentGeneration &&
        scopeRef.current === scope &&
        controller.getSnapshot(drive)?.id === operationId &&
        optionsRef.current.isCurrentScope()
      );
    };
    inFlight.current = true;
    setIsRefreshing(true);
    setRefreshTimedOut(false);
    const timeout = clock.setTimeout(() => {
      if (isCurrent()) {
        generation.current += 1;
        inFlight.current = false;
        setIsRefreshing(false);
        setRefreshFailed(true);
        setRefreshTimedOut(true);
      }
    }, VIEW_REFRESH_TIMEOUT_MS);
    activeTimeout.current = timeout;
    try {
      const successful = await optionsRef.current.onRefresh();
      if (!isCurrent()) {
        return;
      }
      setRefreshFailed(!successful);
      if (successful) {
        lastSuccessfulRefresh.current = operationId;
        setRefreshVersion(version => {
          return version + 1;
        });
      }
    } catch {
      if (isCurrent()) {
        setRefreshFailed(true);
      }
    } finally {
      clock.clearTimeout(timeout);
      if (activeTimeout.current === timeout) {
        activeTimeout.current = undefined;
      }
      if (isCurrent()) {
        inFlight.current = false;
        setIsRefreshing(false);
      }
    }
  }, [clock, controller, drive, matchesPath, operationId, scope]);

  const viewIdentity = JSON.stringify([scope, operationId]);
  const previousViewIdentity = useRef(viewIdentity);
  useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<Clock['setTimeout']> | undefined;
    generation.current += 1;
    inFlight.current = false;
    lastSuccessfulRefresh.current = undefined;
    setIsRefreshing(false);
    setIsRechecking(false);
    if (previousViewIdentity.current !== viewIdentity) {
      previousViewIdentity.current = viewIdentity;
      setRefreshFailed(false);
      setRefreshTimedOut(false);
    }
    const reconcile = async (): Promise<void> => {
      await refresh();
      if (cancelled) {
        return;
      }
      const current = controller.getSnapshot(drive);
      // The job observer triggers a fresh read after terminal evidence; do not race it with another interval.
      const isWaitingForJobEvidence = current?.state === 'processing' && current.jobUuids.length > 0;
      if (
        current?.kind === 'permanent-delete' &&
        current.state !== 'submitting' &&
        current.isLocked &&
        current.needsRefresh &&
        !isWaitingForJobEvidence
      ) {
        retry = clock.setTimeout(() => {
          void reconcile();
        }, PERMANENT_DELETE_REFRESH_INTERVAL_MS);
      }
    };
    if (matchesPath && needsRefresh === true && operationState !== 'submitting') {
      void reconcile();
    }
    return () => {
      cancelled = true;
      generation.current += 1;
      inFlight.current = false;
      if (activeTimeout.current !== undefined) {
        clock.clearTimeout(activeTimeout.current);
        activeTimeout.current = undefined;
      }
      if (retry !== undefined) {
        clock.clearTimeout(retry);
      }
    };
  }, [controller, drive, clock, matchesPath, needsRefresh, operationState, refresh, viewIdentity]);

  useEffect(() => {
    if (
      operation === undefined ||
      lastSuccessfulRefresh.current !== operation.id ||
      !matchesPath ||
      options.isNodesLoading === true ||
      !options.isCurrentScope()
    ) {
      return;
    }
    // A running job is not terminal evidence, even if the current page omits its targets.
    if (operation.state === 'submitting' || operation.state === 'processing') {
      return;
    }
    if (
      operation.kind === 'permanent-delete' &&
      operation.jobUuids.length > 0 &&
      operation.targetIds.some(id => {
        return options.visibleNodeIds?.includes(id) === true;
      })
    ) {
      return;
    }
    if (controller.getSnapshot(drive)?.isLocked !== true) {
      return;
    }
    controller.acknowledgeRefresh(drive, operation.id);
    if (!isBinOperationLocked(controller.getSnapshot(drive))) {
      lastSuccessfulRefresh.current = undefined;
      options.onAcknowledged?.(operation);
    }
  }, [controller, drive, matchesPath, operation, options, refreshVersion]);

  useEffect(() => {
    const onOnline = (): void => {
      void refresh();
    };
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('online', onOnline);
    };
  }, [refresh]);

  const refreshReview = useCallback(async (): Promise<void> => {
    const currentGeneration = generation.current;
    setIsRechecking(true);
    try {
      await controller.recheck(drive);
    } finally {
      if (generation.current === currentGeneration && scopeRef.current === scope) {
        setIsRechecking(false);
      }
    }
    await refresh();
  }, [controller, drive, refresh, scope]);

  return {
    controller,
    operation,
    isLocked: isBinOperationLocked(operation),
    isRefreshing: isRefreshing || isRechecking,
    refreshFailed,
    refreshTimedOut,
    refreshReview,
  };
}
