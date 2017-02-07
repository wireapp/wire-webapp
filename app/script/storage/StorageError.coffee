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
z.storage ?= {}

class z.storage.StorageError
  constructor: (type) ->
    @name = @constructor.name
    @stack = (new Error()).stack
    @type = type or z.storage.StorageError::TYPE.UNKNOWN

    @message = switch @type
      when z.storage.StorageError::TYPE.DATA_STORE_NOT_FOUND
        'Data store not found'
      when z.storage.StorageError::TYPE.FAILED_TO_OPEN
        'Failed to open database'
      when z.storage.StorageError::TYPE.INVALID_TIMESTAMP
        'Invalid timestamp'
      when z.storage.StorageError::TYPE.NO_CONVERSATION_ID
        'Missing conversation ID'
      when z.storage.StorageError::TYPE.NO_SENDER_ID
        'Missing sender ID'
      when z.storage.StorageError::TYPE.NO_TIME
        'Missing time'
      when z.storage.StorageError::TYPE.NON_SEQUENTIAL_UPDATE
        'Update is non sequential'
      when z.storage.StorageError::TYPE.INVALID_TIME
        'Event time needs to be ISO 8601'
      when z.storage.StorageError::TYPE.SKIP_LOADING
        'Skipped loading of sessions and pre-keys'
      when z.storage.StorageError::TYPE.UNKNOWN
        'Unknown StorageError'

  @:: = new Error()
  @::constructor = @
  @::TYPE =
    DATA_STORE_NOT_FOUND: 'z.storage.StorageError::TYPE.DATA_STORE_NOT_FOUND'
    FAILED_TO_OPEN: 'z.storage.StorageError::TYPE.FAILED_TO_OPEN'
    INVALID_TIME: 'z.storage.StorageError::TYPE.INVALID_TIME'
    INVALID_TIMESTAMP: 'z.storage.StorageError::TYPE.INVALID_TIMESTAMP'
    NO_CONVERSATION_ID: 'z.storage.StorageError::TYPE.NO_CONVERSATION_ID'
    NO_SENDER_ID: 'z.storage.StorageError::TYPE.NO_SENDER_ID'
    NO_TIME: 'z.storage.StorageError::TYPE.NO_TIME'
    NON_SEQUENTIAL_UPDATE: 'z.storage.StorageError::TYPE.NON_SEQUENTIAL_UPDATE'
    SKIP_LOADING: 'z.storage.StorageError:TYPE.SKIP_SESSIONS'
    UNKNOWN: 'z.storage.StorageError::TYPE.UNKNOWN'
