/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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
import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
import type {DeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
import {act} from 'react';
import {Maybe, maybe} from 'true-myth';

import {StringKeyValueStorage} from 'src/script/storage/stringKeyValueStorageTypes';

import {createUseSingleInstance} from './useSingleInstance';

function createInMemoryStringKeyValueStorage(): StringKeyValueStorage {
  const storedValues: Array<{key: string; value: string}> = [];

  const storage: StringKeyValueStorage = {
    getItem: key => {
      return maybe
        .find(item => {
          return item.key === key;
        }, storedValues)
        .map(item => {
          return item.value;
        });
    },
    removeItem: key => {
      const storedValueIndex = storedValues.findIndex(item => {
        return item.key === key;
      });

      if (storedValueIndex >= 0) {
        storedValues.splice(storedValueIndex, 1);
      }
    },
    setItem: (key, value) => {
      storage.removeItem(key);
      storedValues.push({key, value});
    },
  };

  return storage;
}

type UseSingleInstanceTestEnvironment = {
  isDesktopApp: jest.Mock<boolean, []>;
  singleInstanceStorage: StringKeyValueStorage;
  useSingleInstance: ReturnType<typeof createUseSingleInstance>;
  wallClock: DeterministicWallClock;
};

function createUseSingleInstanceTestEnvironment(): UseSingleInstanceTestEnvironment {
  const createInstanceId = jest.fn(() => {
    return 'first-instance-id';
  });

  const isDesktopApp = jest.fn(() => {
    return false;
  });

  const singleInstanceStorage = createInMemoryStringKeyValueStorage();
  const wallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
  const useSingleInstance = createUseSingleInstance({createInstanceId, isDesktopApp, singleInstanceStorage, wallClock});

  return {isDesktopApp, singleInstanceStorage, useSingleInstance, wallClock};
}

describe('useSingleInstance', () => {
  it('can create multiple new instance listeners', () => {
    const {useSingleInstance} = createUseSingleInstanceTestEnvironment();

    const {
      result: {current: firstInstance},
    } = renderHook(() => {
      return useSingleInstance();
    });
    expect(firstInstance.hasOtherInstance).toBeFalsy();

    const {
      result: {current: secondInstance},
    } = renderHook(() => {
      return useSingleInstance();
    });
    expect(secondInstance.hasOtherInstance).toBeFalsy();
  });

  it('only allows a single registered instance', () => {
    const {singleInstanceStorage, useSingleInstance} = createUseSingleInstanceTestEnvironment();

    const {
      result: {current: firstInstance},
    } = renderHook(() => {
      return useSingleInstance();
    });
    expect(firstInstance.hasOtherInstance).toBeFalsy();

    firstInstance.registerInstance();

    expect(singleInstanceStorage.getItem('app_opened')).toStrictEqual(
      Maybe.just(JSON.stringify({appInstanceId: 'first-instance-id'})),
    );

    const {
      result: {current: secondInstance},
    } = renderHook(() => {
      return useSingleInstance();
    });
    expect(secondInstance.hasOtherInstance).toBeTruthy();

    firstInstance.killRunningInstance();
  });

  it('detects a new instance that has started', () => {
    const {useSingleInstance, wallClock} = createUseSingleInstanceTestEnvironment();

    const {
      result: {current: firstInstance},
    } = renderHook(() => {
      return useSingleInstance();
    });
    expect(firstInstance.hasOtherInstance).toBeFalsy();

    const {result: secondInstance} = renderHook(() => {
      return useSingleInstance();
    });
    expect(secondInstance.current.hasOtherInstance).toBeFalsy();

    firstInstance.registerInstance();

    act(() => {
      wallClock.advanceByMilliseconds(1001);
    });
    expect(secondInstance.current.hasOtherInstance).toBeTruthy();

    firstInstance.killRunningInstance();
  });

  it('allows desktop app instances regardless of stored instance data', () => {
    const {isDesktopApp, singleInstanceStorage, useSingleInstance, wallClock} =
      createUseSingleInstanceTestEnvironment();

    isDesktopApp.mockReturnValue(true);
    singleInstanceStorage.setItem('app_opened', JSON.stringify({appInstanceId: 'other-instance-id'}));

    const {result: currentInstance} = renderHook(() => {
      return useSingleInstance();
    });

    expect(currentInstance.current.hasOtherInstance).toBeFalsy();

    act(() => {
      wallClock.advanceByMilliseconds(1001);
    });

    expect(currentInstance.current.hasOtherInstance).toBeFalsy();
  });

  it('does not crash when stored instance data is malformed', () => {
    const {singleInstanceStorage, useSingleInstance} = createUseSingleInstanceTestEnvironment();

    singleInstanceStorage.setItem('app_opened', 'not-json');

    const {
      result: {current: currentInstance},
    } = renderHook(() => {
      return useSingleInstance();
    });

    expect(currentInstance.hasOtherInstance).toBeFalsy();
    expect(singleInstanceStorage.getItem('app_opened')).toStrictEqual(Maybe.nothing());
  });

  it('removes stored instance data with an invalid shape', () => {
    const {singleInstanceStorage, useSingleInstance} = createUseSingleInstanceTestEnvironment();

    singleInstanceStorage.setItem('app_opened', JSON.stringify({appInstanceId: 42}));

    const {
      result: {current: currentInstance},
    } = renderHook(() => {
      return useSingleInstance();
    });

    expect(currentInstance.hasOtherInstance).toBeFalsy();
    expect(singleInstanceStorage.getItem('app_opened')).toStrictEqual(Maybe.nothing());
  });

  it('removes stored instance data without an instance id', () => {
    const {singleInstanceStorage, useSingleInstance} = createUseSingleInstanceTestEnvironment();

    singleInstanceStorage.setItem('app_opened', JSON.stringify({}));

    const {
      result: {current: currentInstance},
    } = renderHook(() => {
      return useSingleInstance();
    });

    expect(currentInstance.hasOtherInstance).toBeFalsy();
    expect(singleInstanceStorage.getItem('app_opened')).toStrictEqual(Maybe.nothing());
  });
});
