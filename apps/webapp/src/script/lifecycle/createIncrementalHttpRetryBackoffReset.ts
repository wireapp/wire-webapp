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

import {APIClient} from '../service/APIClientSingleton';

type ConfigureIncrementalHttpRetryBackoffResetDependencies = {
  readonly isElectron: () => boolean;
  readonly subscribeToApplicationSignal: (signalName: 'visibilitychange', listener: () => void) => void;
  readonly apiClient: APIClient;
  readonly subscribeToRuntimeSignal: (signalName: 'focus' | 'online' | 'unload', listener: () => void) => void;
  readonly unsubscribeFromApplicationSignal: (signalName: 'visibilitychange', listener: () => void) => void;
  readonly unsubscribeFromRuntimeSignal: (signalName: 'focus' | 'online', listener: () => void) => void;
  readonly visibilityState: () => DocumentVisibilityState;
};

type VisibilityChangeHandlerDependencies = {
  readonly resetRetryBackoff: () => void;
  readonly visibilityState: () => DocumentVisibilityState;
};

function handleVisibilityChange(dependencies: VisibilityChangeHandlerDependencies): void {
  const {resetRetryBackoff, visibilityState} = dependencies;

  if (visibilityState() !== 'visible') {
    return;
  }

  resetRetryBackoff();
}

export function createIncrementalHttpRetryBackoffReset(
  dependencies: ConfigureIncrementalHttpRetryBackoffResetDependencies,
): () => void {
  const {
    apiClient,
    isElectron,
    subscribeToApplicationSignal,
    subscribeToRuntimeSignal,
    unsubscribeFromApplicationSignal,
    unsubscribeFromRuntimeSignal,
    visibilityState,
  } = dependencies;

  function resetRetryBackoff(): void {
    apiClient.resetIncrementalRetryBackoff();
  }

  const cleanupCallbacks: (() => void)[] = [];

  if (isElectron()) {
    subscribeToRuntimeSignal('focus', resetRetryBackoff);
    cleanupCallbacks.push(() => {
      unsubscribeFromRuntimeSignal('focus', resetRetryBackoff);
    });
  } else {
    function handleApplicationVisibilityChange(): void {
      handleVisibilityChange({resetRetryBackoff, visibilityState});
    }

    subscribeToApplicationSignal('visibilitychange', handleApplicationVisibilityChange);
    cleanupCallbacks.push(() => {
      unsubscribeFromApplicationSignal('visibilitychange', handleApplicationVisibilityChange);
    });
  }

  subscribeToRuntimeSignal('online', resetRetryBackoff);
  cleanupCallbacks.push(() => {
    unsubscribeFromRuntimeSignal('online', resetRetryBackoff);
  });

  return () => {
    cleanupCallbacks.forEach(cleanupCallback => {
      cleanupCallback();
    });
  };
}
