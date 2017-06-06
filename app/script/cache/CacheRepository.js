/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.cache = z.cache || {};

/**
 * Cache repository for local storage interactions using amplify.
 *
 * @todo We have to come up with a smart solution to handle "amplify.store quota exceeded"
 *  This happened when doing "@cache_repository.set_entity user_et"
 *
 */
z.cache.CacheRepository = class CacheRepository {
  constructor() {
    this.logger = new z.util.Logger(
      'z.auth.CacheRepository',
      z.config.LOGGER.OPTIONS,
    );
  }

  /**
   * Deletes cached data.
   *
   * @param {boolean} [keep_conversation_input=false] - Should conversation input be kept
   * @param {Array<string>} [protected_key_patterns=[z.storage.StorageKey.AUTH.SHOW_LOGIN]] - Keys which should NOT be deleted from the cache
   * @returns {Array<string>} Keys which have been deleted from the cache
   */
  clear_cache(
    keep_conversation_input = false,
    protected_key_patterns = [z.storage.StorageKey.AUTH.SHOW_LOGIN],
  ) {
    const deleted_keys = [];

    if (keep_conversation_input) {
      protected_key_patterns.push(z.storage.StorageKey.CONVERSATION.INPUT);
    }

    for (const stored_key in amplify.store()) {
      let should_be_deleted = true;

      for (const pattern in protected_key_patterns) {
        if (stored_key.startsWith(protected_key_patterns[pattern])) {
          should_be_deleted = false;
        }
      }

      if (should_be_deleted) {
        z.util.StorageUtil.reset_value(stored_key);
        deleted_keys.push(stored_key);
      }
    }

    return deleted_keys;
  }
};
