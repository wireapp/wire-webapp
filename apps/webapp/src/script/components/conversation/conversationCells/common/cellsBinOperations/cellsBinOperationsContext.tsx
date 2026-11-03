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

import {createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode} from 'react';

import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import {amplify} from 'amplify';

import {WebAppEvents} from 'src/script/webAppEvents';

import type {BinOperation, CellsBinOperationController} from './cellsBinOperationController';

const CellsBinOperationsContext = createContext<CellsBinOperationController | null>(null);

export function CellsBinOperationsProvider({
  value,
  children,
}: {
  readonly value: CellsBinOperationController;
  readonly children: ReactNode;
}): ReactNode {
  useEffect(() => {
    const recheck = (): void => {
      void value.recheckAll();
    };
    const dispose = (): void => {
      value.dispose();
    };
    window.addEventListener('online', recheck);
    amplify.subscribe(WebAppEvents.LIFECYCLE.SIGNED_OUT, dispose);
    return () => {
      window.removeEventListener('online', recheck);
      amplify.unsubscribe(WebAppEvents.LIFECYCLE.SIGNED_OUT, dispose);
    };
  }, [value]);

  return <CellsBinOperationsContext.Provider value={value}>{children}</CellsBinOperationsContext.Provider>;
}

export function useCellsBinOperation(drive: QualifiedId): {
  readonly controller: CellsBinOperationController;
  readonly operation: BinOperation | undefined;
} {
  const controller = useContext(CellsBinOperationsContext);
  if (controller === null) {
    throw new Error('CellsBinOperationsProvider has not been set');
  }
  const getSnapshot = useCallback(() => {
    return controller.getSnapshot({id: drive.id, domain: drive.domain});
  }, [controller, drive.id, drive.domain]);
  const operation = useSyncExternalStore(controller.subscribe, getSnapshot);

  useEffect(() => {
    void controller.recheck({id: drive.id, domain: drive.domain});
  }, [controller, drive.id, drive.domain]);

  return {controller, operation};
}

export function isBinOperationLocked(operation: ReturnType<CellsBinOperationController['getSnapshot']>): boolean {
  return operation?.isLocked ?? false;
}
