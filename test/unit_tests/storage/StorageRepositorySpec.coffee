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

# grunt test_init && grunt test_run:storage/StorageRepository

describe 'z.storage.StorageRepository', ->
  test_factory = new TestFactory()

  beforeAll (done) ->
    test_factory.exposeStorageActors().then(done).catch done.fail

  describe 'construct_primary_key', ->
    it 'constructs primary keys', ->
      conversation_id = '35d8767e-83c9-4e9a-a5ee-32ba7de706f2'
      sender_id = '532af01e-1e24-4366-aacf-33b67d4ee376'
      time = '2016-07-09T19:10:55.076Z'

      actual = storage_repository.construct_primary_key conversation_id, sender_id, time
      expected = "#{conversation_id}@#{sender_id}@1468091455076"

      expect(actual).toBe expected

  describe 'save_value',  ->
    it 'persists values', (done)->
      primary_key = 'test'
      object = {type: 'test'}

      storage_repository.save_value primary_key, object
      .then (storage_key) ->
        expect(storage_key).toBe primary_key
        done()
      .catch done.fail

