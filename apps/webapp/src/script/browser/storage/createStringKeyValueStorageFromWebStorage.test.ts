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

import {Maybe, maybe} from 'true-myth';

import {createStringKeyValueStorageFromWebStorage} from './createStringKeyValueStorageFromWebStorage';

const storageKey = 'app_opened';
const storageValue = 'stored-value';

function createWorkingWebStorage(): Storage {
  const storedValues: Array<{key: string; value: string}> = [];

  return {
    get length(): number {
      return storedValues.length;
    },
    clear: (): void => {
      storedValues.splice(0, storedValues.length);
    },
    getItem: key => {
      return maybe
        .find(item => {
          return item.key === key;
        }, storedValues)
        .map(item => {
          return item.value;
        })
        .unwrapOr(null);
    },
    key: index => {
      return Maybe.of(storedValues[index])
        .map(item => {
          return item.key;
        })
        .unwrapOr(null);
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
      const storedValueIndex = storedValues.findIndex(item => {
        return item.key === key;
      });

      if (storedValueIndex >= 0) {
        storedValues.splice(storedValueIndex, 1, {key, value});
        return;
      }

      storedValues.push({key, value});
    },
  };
}

type ThrowingWebStorageOperation = 'getItem' | 'removeItem' | 'setItem';

function createThrowingWebStorage(throwingOperation: ThrowingWebStorageOperation): Storage {
  return {
    get length(): number {
      return 0;
    },
    clear: (): void => {},
    getItem: () => {
      if (throwingOperation === 'getItem') {
        throw new Error('Storage getItem failed');
      }

      return null;
    },
    key: () => {
      return null;
    },
    removeItem: () => {
      if (throwingOperation === 'removeItem') {
        throw new Error('Storage removeItem failed');
      }
    },
    setItem: () => {
      if (throwingOperation === 'setItem') {
        throw new Error('Storage setItem failed');
      }
    },
  };
}

describe('createStringKeyValueStorageFromWebStorage', () => {
  it('treats unavailable storage as empty no-op storage', () => {
    const stringKeyValueStorage = createStringKeyValueStorageFromWebStorage(Maybe.nothing());

    stringKeyValueStorage.setItem(storageKey, storageValue);
    stringKeyValueStorage.removeItem(storageKey);

    expect(stringKeyValueStorage.getItem(storageKey)).toStrictEqual(Maybe.nothing());
  });

  it('returns nothing when getItem throws', () => {
    const webStorage = createThrowingWebStorage('getItem');
    const stringKeyValueStorage = createStringKeyValueStorageFromWebStorage(Maybe.just(webStorage));

    expect(stringKeyValueStorage.getItem(storageKey)).toStrictEqual(Maybe.nothing());
  });

  it('does not throw when setItem throws', () => {
    const webStorage = createThrowingWebStorage('setItem');
    const stringKeyValueStorage = createStringKeyValueStorageFromWebStorage(Maybe.just(webStorage));

    expect(() => {
      stringKeyValueStorage.setItem(storageKey, storageValue);
    }).not.toThrow();
  });

  it('does not throw when removeItem throws', () => {
    const webStorage = createThrowingWebStorage('removeItem');
    const stringKeyValueStorage = createStringKeyValueStorageFromWebStorage(Maybe.just(webStorage));

    expect(() => {
      stringKeyValueStorage.removeItem(storageKey);
    }).not.toThrow();
  });

  it('stores, reads, and removes values when storage succeeds', () => {
    const webStorage = createWorkingWebStorage();
    const stringKeyValueStorage = createStringKeyValueStorageFromWebStorage(Maybe.just(webStorage));

    stringKeyValueStorage.setItem(storageKey, storageValue);

    expect(stringKeyValueStorage.getItem(storageKey)).toStrictEqual(Maybe.just(storageValue));

    stringKeyValueStorage.removeItem(storageKey);

    expect(stringKeyValueStorage.getItem(storageKey)).toStrictEqual(Maybe.nothing());
  });
});
