#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

window.z ?= {}
z.cache ?= {}

###
Cache repository for local storage interactions using amplify.

@todo We have to come up with a smart solution to handle "amplify.store quota exceeded"
  This happened when doing "@cache_repository.set_entity user_et"

###
class z.cache.CacheRepository
  # Construct a new Cache Repository.
  constructor: ->
    @logger = new z.util.Logger 'z.auth.CacheRepository', z.config.LOGGER.OPTIONS

  ###
  Deletes cached data.

  @param keep_conversation_input [Boolean] Should conversation input be kept
  @param protected_key_patterns [Array<String>] Keys which should NOT be deleted from the cache

  @return [Array<String>] Keys which have been deleted from the cache
  ###
  clear_cache: (keep_conversation_input = false, protected_key_patterns = [z.storage.StorageKey.AUTH.SHOW_LOGIN]) ->
    protected_key_patterns.push z.storage.StorageKey.CONVERSATION.INPUT if keep_conversation_input
    deleted_keys = []

    $.each amplify.store(), (stored_key) ->
      should_be_deleted = true

      for protected_key_pattern in protected_key_patterns
        should_be_deleted = false if stored_key.startsWith protected_key_pattern

      if should_be_deleted
        z.util.StorageUtil.reset_value stored_key
        deleted_keys.push stored_key

    return deleted_keys
