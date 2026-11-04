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

import {renderHook} from '@testing-library/react';
import {createDeterministicClock, type DeterministicClock} from '@enormora/clock/deterministic-clock';
import {act} from 'react';
import {Maybe} from 'true-myth';

import {createUseSingleInstance} from 'src/script/hooks/useSingleInstance';
import {StringKeyValueStorage} from 'src/script/storage/stringKeyValueStorageTypes';

import {getOtherInstanceAction} from './getOtherInstanceAction';

type InMemoryStorage = StringKeyValueStorage & {clear: () => void};

function createInMemoryStorage(): InMemoryStorage {
  const storedValues = new Map<string, string>();

  return {
    getItem: key => {
      return Maybe.of(storedValues.get(key));
    },
    removeItem: key => {
      storedValues.delete(key);
    },
    setItem: (key, value) => {
      storedValues.set(key, value);
    },
    clear: () => {
      storedValues.clear();
    },
  };
}

type RenderRegisteredSingleInstanceResult = {
  result: {current: {hasOtherInstance: boolean; killRunningInstance: () => void; registerInstance: () => () => void}};
  storage: InMemoryStorage;
  clock: DeterministicClock;
};
function renderRegisteredSingleInstance(): RenderRegisteredSingleInstanceResult {
  const storage = createInMemoryStorage();
  const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
  const useSingleInstance = createUseSingleInstance({
    createInstanceId: () => {
      return 'current-tab';
    },
    isDesktopApp: () => {
      return false;
    },
    singleInstanceStorage: storage,
    clock,
  });

  const {result} = renderHook(() => {
    return useSingleInstance();
  });
  result.current.registerInstance();

  return {result, storage, clock};
}

describe('getOtherInstanceAction', () => {
  it('ignores the single-instance marker disappearing while logout wipes the storage', () => {
    const {result, storage, clock} = renderRegisteredSingleInstance();

    storage.clear();
    act(() => {
      clock.advanceByMilliseconds(1001);
    });

    expect(result.current.hasOtherInstance).toBe(true);
    expect(
      getOtherInstanceAction({
        hasOtherInstance: result.current.hasOtherInstance,
        isLoggingOut: true,
        isAutoLoginEnabled: false,
      }),
    ).toBe('none');
  });

  it('redirects to login when another tab takes over outside of a logout', () => {
    const {result, storage, clock} = renderRegisteredSingleInstance();

    storage.setItem('app_opened', JSON.stringify({appInstanceId: 'other-tab'}));
    act(() => {
      clock.advanceByMilliseconds(1001);
    });

    expect(
      getOtherInstanceAction({
        hasOtherInstance: result.current.hasOtherInstance,
        isLoggingOut: false,
        isAutoLoginEnabled: false,
      }),
    ).toBe('redirect-to-login');
  });

  it('signs out instead of redirecting when auto login is enabled', () => {
    expect(getOtherInstanceAction({hasOtherInstance: true, isLoggingOut: false, isAutoLoginEnabled: true})).toBe(
      'sign-out',
    );
  });

  it('does nothing while this tab is the only instance', () => {
    expect(getOtherInstanceAction({hasOtherInstance: false, isLoggingOut: false, isAutoLoginEnabled: false})).toBe(
      'none',
    );
  });
});
