/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {amplify} from 'amplify';

import {StorageKey} from 'Repositories/storage/StorageKey';
import {resetStoreValue} from 'Util/StorageUtil';

export class CacheRepository {
  public static CACHE_KEY = {
    // Redefine name from "sw.js"
    ASSETS: `asset-cache-v3`,
  };

  // Caution! When refactoring this code, make sure that it works in an "beforeunload" scenario!
  static async clearCacheStorage(): Promise<boolean> {
    return window.caches.delete(CacheRepository.CACHE_KEY.ASSETS);
  }

  /**
   * Deletes cached data.
   *
   * @param keepConversationInput Should conversation input be kept
   * @param protectedKeyPatterns Keys which should NOT be deleted from
   *   the cache
   * @returns Keys which have been deleted from the cache
   */
  static clearLocalStorage(
    keepConversationInput: boolean = false,
    protectedKeyPatterns: string[] = [StorageKey.AUTH.SHOW_LOGIN],
  ): string[] {
    const deletedKeys = [];

    if (keepConversationInput) {
      protectedKeyPatterns.push(StorageKey.CONVERSATION.INPUT);
    }

    for (const storedKey in amplify.store()) {
      const shouldBeDeleted = !protectedKeyPatterns.some(pattern => storedKey.startsWith(pattern));

      if (shouldBeDeleted) {
        resetStoreValue(storedKey);
        deletedKeys.push(storedKey);
      }
    }

    return deletedKeys;
  }
}
