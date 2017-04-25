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

# grunt test_init && grunt test_run:client/ClientRepository

describe 'z.client.ClientRepository', ->
  test_factory = new TestFactory()
  client_id = '5021d77752286cac'
  user_id = undefined

  beforeAll (done) ->
    test_factory.exposeClientActors()
    .then ->
      user_id = client_repository.self_user().id
      done()
    .catch done.fail

  beforeEach ->
    storage_repository.clear_all_stores()

  describe 'get_clients_by_user_id', ->
    it 'maps client entities from client payloads by the backend', (done) ->
      client_repository.current_client new z.client.Client {id: client_id}
      spyOn(client_service, 'get_clients_by_user_id').and.returnValue Promise.resolve [
        {id: '706f64373b1bcf79', class: 'desktop'}
        {id: '809fd276d6709474', class: 'phone'}
        {id: '8e11e06549c8cf1a', class: 'desktop'}
        {id: 'c411f97b139c818b', class: 'tablet'}
        {id: 'cbf3ea49214702d8', class: 'desktop'}
      ]

      client_repository.get_clients_by_user_id entities.user.john_doe.id
      .then (client_ets) ->
        expect(client_ets[0] instanceof z.client.Client).toBeTruthy()
        expect(Object.keys(client_ets).length).toBe 5
        done()
      .catch done.fail

  describe 'get_valid_local_client', ->
    server = undefined
    client_url = "#{test_factory.settings.connection.rest_url}/clients/#{client_id}"
    client_payload_server =
      'time': '2016-05-02T11:53:49.976Z'
      'location':
        'lat': 52.5233
        'lon': 13.4138
      'address': '62.96.148.44'
      'model': 'Wire for Windows'
      'id': client_id
      'type': 'permanent'
      'class': 'desktop'
      'label': 'Windows 10'
    client_payload_database = client_payload_server
    client_payload_database.meta =
      'is_verified': true
      'primary_key': 'local_identity'

    beforeEach ->
      server = sinon.fakeServer.create()
      server.autoRespond = true

    afterEach ->
      server.restore()

    it 'resolves with a valid client', (done) ->
      spyOn(client_service, 'load_client_from_db').and.returnValue Promise.resolve client_payload_database

      server.respondWith 'GET', client_url, [
        200
        'Content-Type': 'application/json'
        JSON.stringify client_payload_server
      ]

      client_repository.get_valid_local_client()
      .then (client_observable) ->
        expect(client_observable).toBeDefined()
        expect(client_observable().id).toBe client_id
        done()
      .catch done.fail

    it 'rejects with an error if no client found locally', (done) ->
      spyOn client_service, 'load_client_from_db'
      .and.returnValue Promise.resolve z.client.ClientRepository.PRIMARY_KEY_CURRENT_CLIENT

      client_repository.get_valid_local_client()
      .then done.fail
      .catch (error) ->
        expect(error).toEqual jasmine.any z.client.ClientError
        expect(error.type).toBe z.client.ClientError.TYPE.NO_LOCAL_CLIENT
        done()

    it 'rejects with an error if client removed on backend', (done) ->
      spyOn(client_service, 'load_client_from_db').and.returnValue Promise.resolve client_payload_database
      spyOn(storage_service, 'delete_everything').and.returnValue Promise.resolve true

      client_repository.get_valid_local_client()
      .then done.fail
      .catch (error) ->
        expect(error).toEqual jasmine.any z.client.ClientError
        expect(error.type).toBe z.client.ClientError.TYPE.MISSING_ON_BACKEND
        done()

    it 'rejects with an error if database deletion fails', (done) ->
      spyOn(client_service, 'load_client_from_db').and.returnValue Promise.resolve client_payload_database
      spyOn(storage_repository, 'delete_cryptography').and.returnValue Promise.reject new Error 'Expected unit test error'

      client_repository.get_valid_local_client()
      .then done.fail
      .catch (error) ->
        expect(error).toEqual jasmine.any z.client.ClientError
        expect(error.type).toBe z.client.ClientError.TYPE.DATABASE_FAILURE
        done()

    it 'rejects with an error if something else fails', (done) ->
      spyOn(client_service, 'load_client_from_db').and.returnValue Promise.reject new Error 'Expected unit test error'

      client_repository.get_valid_local_client()
      .then done.fail
      .catch (error) ->
        expect(error).toEqual jasmine.any Error
        expect(error.type).toBe z.client.ClientError.TYPE.DATABASE_FAILURE
        done()

  describe '_construct_primary_key', ->
    it 'returns a proper primary key for a client', ->
      actual_primary_key = client_repository._construct_primary_key user_id, client_id
      expected_primary_key = "#{user_id}@#{client_id}"
      expect(actual_primary_key).toEqual expected_primary_key

    it 'throws an error if missing user ID', ->
      function_call = -> client_repository._construct_primary_key undefined, client_id
      expect(function_call).toThrowError z.client.ClientError, 'User ID is not defined'

    it 'throws and error if missing client ID', ->
      function_call = -> client_repository._construct_primary_key user_id, undefined
      expect(function_call).toThrowError z.client.ClientError, 'Client ID is not defined'

  describe 'is_current_client_permanent', ->
    beforeEach ->
      z.util.Environment.electron = false
      client_repository.current_client undefined

    it 'returns true on Electron', ->
      client_repository.current_client new z.client.Client {type: z.client.ClientType.PERMANENT}
      z.util.Environment.electron = true
      is_permanent = client_repository.is_current_client_permanent()
      expect(is_permanent).toBeTruthy()

    it 'returns true on Electron even if client is temporary', ->
      client_repository.current_client new z.client.Client {type: z.client.ClientType.TEMPORARY}
      z.util.Environment.electron = true
      is_permanent = client_repository.is_current_client_permanent()
      expect(is_permanent).toBeTruthy()

    it 'throws an error on Electron if no current client', ->
      z.util.Environment.electron = true
      function_call = -> client_repository.is_current_client_permanent()
      expect(function_call).toThrowError z.client.ClientError, 'Local client is not yet set'

    it 'returns true if current client is permanent', ->
      client_repository.current_client new z.client.Client {type: z.client.ClientType.PERMANENT}
      is_permanent = client_repository.is_current_client_permanent()
      expect(is_permanent).toBeTruthy()

    it 'returns false if current client is temporary', ->
      client_repository.current_client new z.client.Client {type: z.client.ClientType.TEMPORARY}
      is_permanent = client_repository.is_current_client_permanent()
      expect(is_permanent).toBeFalsy()

    it 'throws an error if no current client', ->
      function_call = -> client_repository.is_current_client_permanent()
      expect(function_call).toThrowError z.client.ClientError, 'Local client is not yet set'

  describe '_is_current_client', ->
    beforeEach -> client_repository.current_client undefined

    it 'returns true if user ID and client ID match', ->
      client_repository.current_client new z.client.Client {id: client_id}
      client_repository.self_user new z.entity.User user_id
      result = client_repository._is_current_client user_id, client_id
      expect(result).toBeTruthy()

    it 'returns false if only the user ID matches', ->
      client_repository.current_client new z.client.Client {id: client_id}
      result = client_repository._is_current_client user_id, 'ABCDE'
      expect(result).toBeFalsy()

    it 'returns false if only the client ID matches', ->
      client_repository.current_client new z.client.Client {id: client_id}
      result = client_repository._is_current_client 'ABCDE', client_id
      expect(result).toBeFalsy()

    it 'throws an error if current client is not set', ->
      function_call = -> client_repository._is_current_client user_id, client_id
      expect(function_call).toThrowError z.client.ClientError, 'Local client is not yet set'

    it 'throws an error if client ID is not specified', ->
      client_repository.current_client new z.client.Client()
      function_call = -> client_repository._is_current_client user_id
      expect(function_call).toThrowError z.client.ClientError, 'Client ID is not defined'

    it 'throws an error if user ID is not specified', ->
      client_repository.current_client new z.client.Client()
      function_call = -> client_repository._is_current_client undefined, client_id
      expect(function_call).toThrowError z.client.ClientError, 'User ID is not defined'
