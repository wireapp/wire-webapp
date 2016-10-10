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

# grunt test_init && grunt test_run:storage/StorageService

describe 'z.storage.StorageService', ->
  describe 'construct_primary_key', ->
    event = undefined
    expected_key = undefined

    beforeEach ->
      event =
        conversation: '35d8767e-83c9-4e9a-a5ee-32ba7de706f2'
        from: '532af01e-1e24-4366-aacf-33b67d4ee376'
        time: '2016-07-09T19:10:55.076Z'
      expected_key = "#{event.conversation}@#{event.from}@1468091455076"

    it 'constructs primary keys', ->
      actual = z.storage.StorageService.construct_primary_key event

      expect(actual).toBe expected_key

    it 'works with iso time', ->
      event.time = new Date(1468091455076).toISOString()
      actual = z.storage.StorageService.construct_primary_key event

      expect(actual).toBe expected_key

    it 'throws an error on missing conversation ID', ->
      event.conversation = null
      function_call = -> z.storage.StorageService.construct_primary_key event
      expect(function_call).toThrowError z.storage.StorageError, 'Missing conversation ID'

    it 'throws an error on missing user ID', ->
      event.from = null
      function_call = -> z.storage.StorageService.construct_primary_key event
      expect(function_call).toThrowError z.storage.StorageError, 'Missing sender ID'

    it 'throws an error on missing time', ->
      event.time = null
      function_call = -> z.storage.StorageService.construct_primary_key event
      expect(function_call).toThrowError z.storage.StorageError, 'Missing time'

    it 'throws an error on invalid time', ->
      event.time = 'A'
      function_call = -> z.storage.StorageService.construct_primary_key event
      expect(function_call).toThrowError z.storage.StorageError, 'Event time needs to be ISO 8601'

    it 'throws an error on invalid timestamps', ->
      event.time = '2011-11-39T14:48:00.000Z'
      function_call = -> z.storage.StorageService.construct_primary_key event
      expect(function_call).toThrowError z.storage.StorageError, 'Invalid timestamp'
