/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useSyncExternalStore} from 'react';

import {getLogger} from 'Util/Logger';

const logger = getLogger('useLocalStorage');

const parseJSON = <Value>(key: string, value: string | null): Value | null => {
  try {
    return value === null ? null : JSON.parse(value);
  } catch {
    logger.development.error(`Error parsing JSON for key "${key}"`);
    return null;
  }
};

export const useLocalStorage = <T>(key: string) => {
  const setLocalStorage = (newValue: T): void => {
    const serializedValue = JSON.stringify(newValue);
    window.localStorage.setItem(key, serializedValue);
    window.dispatchEvent(new StorageEvent('storage', {key, newValue: serializedValue}));
  };

  const getSnapshot = () => localStorage.getItem(key);

  const subscribe = (listener: () => void) => {
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  };

  const store = useSyncExternalStore(subscribe, getSnapshot);

  return [parseJSON<T>(key, store), setLocalStorage] as const;
};
