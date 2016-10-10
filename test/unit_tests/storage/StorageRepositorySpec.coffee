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

  beforeEach ->
    storage_repository.clear_all_stores()

  describe 'save_value',  ->
    it 'persists primitive values in an object format', (done)->
      primary_key = 'test_key'
      primitive_value = 'test_value'

      storage_repository.save_value primary_key, primitive_value
      .then (storage_key) ->
        expect(storage_key).toBe primary_key
        done()
      .catch done.fail

  describe 'save_conversation_event',  ->
    event = undefined

    beforeEach ->
      event =
        conversation: z.util.create_random_uuid()
        id: z.util.create_random_uuid()
        type: z.event.Client.CONVERSATION.MESSAGE_ADD
        from: z.util.create_random_uuid()
        time: new Date().toISOString()

    it 'fails if event is undefined', (done)->
      storage_repository.save_conversation_event()
      .then done.fail
      .catch done

    it 'fails if conversation is missing', (done) ->
      delete event.conversation
      storage_repository.save_conversation_event event
      .then done.fail
      .catch (error) ->
        if error.type is z.storage.StorageError::TYPE.NO_CONVERSATION_ID then done() else done.fail()

    it 'fails if sender is missing', (done) ->
      delete event.from
      storage_repository.save_conversation_event event
      .then done.fail
      .catch (error) ->
        if error.type is z.storage.StorageError::TYPE.NO_SENDER_ID then done() else done.fail()

    it 'fails if time is missing', (done) ->
      delete event.time
      storage_repository.save_conversation_event event
      .then done.fail
      .catch (error) ->
        if error.type is z.storage.StorageError::TYPE.NO_TIME then done() else done.fail()

    it 'fails if time is not ISO 8601', (done) ->
      event.time = Date.now()
      storage_repository.save_conversation_event event
      .then done.fail
      .catch (error) ->
        if error.type is z.storage.StorageError::TYPE.NO_TIME then done() else done.fail()
