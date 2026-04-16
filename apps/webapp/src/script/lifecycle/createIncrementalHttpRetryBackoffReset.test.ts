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

import assert from 'assert';

import {APIClient} from '../service/APIClientSingleton';
import {createIncrementalHttpRetryBackoffReset} from './createIncrementalHttpRetryBackoffReset';

type ListenerMap = Map<string, () => void>;

type ConfigureIncrementalHttpRetryBackoffResetDependenciesForTest = {
  readonly applicationSignalListeners: ListenerMap;
  readonly apiClient: APIClient;
  readonly resetIncrementalRetryBackoff: jest.Mock<void, []>;
  readonly runtimeSignalListeners: ListenerMap;
  readonly subscribeToApplicationSignal: jest.Mock<void, ['visibilitychange', () => void]>;
  readonly subscribeToRuntimeSignal: jest.Mock<void, ['focus' | 'online' | 'unload', () => void]>;
  readonly unsubscribeFromApplicationSignal: jest.Mock<void, ['visibilitychange', () => void]>;
  readonly unsubscribeFromRuntimeSignal: jest.Mock<void, ['focus' | 'online', () => void]>;
};

function createConfigureIncrementalHttpRetryBackoffResetDependenciesForTest(): ConfigureIncrementalHttpRetryBackoffResetDependenciesForTest {
  const applicationSignalListeners: ListenerMap = new Map();
  const runtimeSignalListeners: ListenerMap = new Map();
  const resetIncrementalRetryBackoff = jest.fn();
  const apiClient = {
    resetIncrementalRetryBackoff,
  } as APIClient;
  const subscribeToApplicationSignal = jest.fn((signalName: 'visibilitychange', listener: () => void) => {
    applicationSignalListeners.set(signalName, listener);
  });
  const unsubscribeFromApplicationSignal = jest.fn((signalName: 'visibilitychange', _listener: () => void) => {
    applicationSignalListeners.delete(signalName);
  });
  const subscribeToRuntimeSignal = jest.fn((signalName: 'focus' | 'online' | 'unload', listener: () => void) => {
    runtimeSignalListeners.set(signalName, listener);
  });
  const unsubscribeFromRuntimeSignal = jest.fn((signalName: 'focus' | 'online', _listener: () => void) => {
    runtimeSignalListeners.delete(signalName);
  });

  return {
    applicationSignalListeners,
    apiClient,
    resetIncrementalRetryBackoff,
    runtimeSignalListeners,
    subscribeToApplicationSignal,
    subscribeToRuntimeSignal,
    unsubscribeFromApplicationSignal,
    unsubscribeFromRuntimeSignal,
  };
}

describe('createIncrementalHttpRetryBackoffReset', () => {
  it('resets retry backoff when the browser tab becomes visible and when the app goes online', () => {
    const dependenciesForTest = createConfigureIncrementalHttpRetryBackoffResetDependenciesForTest();
    let currentDocumentVisibilityState: DocumentVisibilityState = 'hidden';

    const cleanup = createIncrementalHttpRetryBackoffReset({
      ...dependenciesForTest,
      visibilityState: () => {
        return currentDocumentVisibilityState;
      },
      isElectron: () => {
        return false;
      },
    });

    expect(dependenciesForTest.subscribeToApplicationSignal).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );
    expect(dependenciesForTest.subscribeToRuntimeSignal).toHaveBeenCalledWith('online', expect.any(Function));

    const visibilityChangeListener = dependenciesForTest.applicationSignalListeners.get('visibilitychange');
    const onlineListener = dependenciesForTest.runtimeSignalListeners.get('online');

    assert(visibilityChangeListener !== undefined);
    assert(onlineListener !== undefined);

    visibilityChangeListener();
    expect(dependenciesForTest.resetIncrementalRetryBackoff).not.toHaveBeenCalled();

    currentDocumentVisibilityState = 'visible';
    visibilityChangeListener();
    onlineListener();

    expect(dependenciesForTest.resetIncrementalRetryBackoff).toHaveBeenCalledTimes(2);

    cleanup();

    expect(dependenciesForTest.unsubscribeFromApplicationSignal).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );
    expect(dependenciesForTest.unsubscribeFromRuntimeSignal).toHaveBeenCalledWith('online', expect.any(Function));
  });

  it('resets retry backoff on window focus in electron', () => {
    const dependenciesForTest = createConfigureIncrementalHttpRetryBackoffResetDependenciesForTest();

    createIncrementalHttpRetryBackoffReset({
      ...dependenciesForTest,
      visibilityState: () => {
        return 'hidden';
      },
      isElectron: () => {
        return true;
      },
    });

    expect(dependenciesForTest.subscribeToRuntimeSignal).toHaveBeenCalledWith('focus', expect.any(Function));

    const focusListener = dependenciesForTest.runtimeSignalListeners.get('focus');

    assert(focusListener !== undefined);

    focusListener();

    expect(dependenciesForTest.resetIncrementalRetryBackoff).toHaveBeenCalledTimes(1);
  });
});
