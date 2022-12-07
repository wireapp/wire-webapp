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

/**
 * Gives back the browser's instance of localstorage if present.
 * Will prevent failing if localStorage is not accessible because cookies are disabled
 */
export function getStorage(): Storage | undefined {
  try {
    /**
     * If users disable cookies in their browsers, they won't have access to the localStorage API.
     * The following check will fix this error:
     * > Failed to read the 'localStorage' property from 'Window': Access is denied for this document
     * (note: Some version of Firefox do not throw an error but, instead, return a null object, we also need to account for that scenario)
     */
    return window.localStorage;
  } catch (error) {
    return undefined;
  }
}

/**
 * Clears all keys starting with the given prefix from the given storage
 * Supports storages with the web storage API (localStorage, sessionStorage)
 * @param prefix string
 * @param storage Storage
 */
export function clearKeysStartingWith(prefix: string, storage: Storage): void {
  Object.keys(storage)
    .filter(item => item.startsWith(prefix))
    .forEach(item => {
      storage.removeItem(item);
    });
}
