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

# grunt test_init && grunt test_run:user/UserRepository

describe 'z.user.UserRepository', ->
  server = null
  test_factory = new TestFactory()

  beforeAll (done) ->
    test_factory.exposeUserActors().then(done).catch done.fail

  beforeEach ->
    server = sinon.fakeServer.create()
    server.autoRespond = true

  afterEach ->
    user_repository.users []
    server.restore()

  describe 'connections', ->
    describe 'cancel_connection_request', ->
      user_et = undefined

      beforeEach ->
        connection_et = new z.entity.Connection z.util.create_random_uuid()
        connection_et.to = entities.user.jane_roe.id

        user_et = new z.entity.User entities.user.john_doe.id
        user_et.connection connection_et

        user_repository.connections.push connection_et
        spyOn(user_repository, '_update_connection_status').and.returnValue Promise.resolve()

      it 'sets the connection status to cancelled', (done) ->
        user_repository.cancel_connection_request user_et
        .then ->
          expect(user_repository._update_connection_status).toHaveBeenCalled()
          done()
        .catch done.fail

      it 'it switches the conversation if requested', (done) ->
        spy = jasmine.createSpy 'conversation_show'
        amplify.subscribe z.event.WebApp.CONVERSATION.SHOW, spy
        user_repository.cancel_connection_request user_et, new z.entity.Conversation()
        .then ->
          expect(user_repository._update_connection_status).toHaveBeenCalled()
          expect(spy).toHaveBeenCalled()
          done()
        .catch done.fail

    describe 'get_connection_by_conversation_id', ->
      connection_et_a = null
      connection_et_b = null

      beforeEach ->
        connection_et_a = new z.entity.Connection()
        connection_et_a.conversation_id = '874d2afe-821d-4f8c-9d3d-3b0fea948e43'
        user_repository.connections.push connection_et_a
        connection_et_b = new z.entity.Connection()
        connection_et_a.conversation_id = 'a8566a3b-0f24-448e-a0dc-85992c140fb5'
        user_repository.connections.push connection_et_b

      afterEach ->
        user_repository.connections.removeAll()

      it 'returns connection for the given conversation id' , ->
        connection_et = user_repository.get_connection_by_conversation_id connection_et_a.conversation_id
        expect(connection_et).toBe connection_et_a

      it 'returns connection for the given conversation id' , ->
        connection_et = user_repository.get_connection_by_conversation_id ''
        expect(connection_et).not.toBeDefined()

    describe 'get_connections', ->
      # TODO: This test seems to be flaky!
      xit 'gets the connected users', (done) ->
        server.respondWith 'GET', "#{test_factory.settings.connection.rest_url}/connections?size=500", [
          200
          'Content-Type': 'application/json'
          JSON.stringify payload.connections.get
        ]

        server.respondWith 'GET', "#{test_factory.settings.connection.rest_url}/users?ids=#{entities.user.jane_roe.id}%2C#{entities.user.jane_roe.id}", [
          200
          'Content-Type': 'application/json'
          JSON.stringify payload.users.get.many
        ]

        user_repository.get_connections()
        .then ->
          expect(user_repository.connections().length).toBe 2
          expect(user_repository.connections()[0].status()).toEqual z.user.ConnectionStatus.ACCEPTED
          expect(user_repository.connections()[1].conversation_id).toEqual '45c8f986-6c8f-465b-9ac9-bd5405e8c944'
          done()
        .catch done.fail

  describe 'users', ->
    describe 'add_client_to_user', ->
      beforeEach ->
        user_et = new z.entity.User()
        user_repository.save_user user_et

        it 'adds a client entity to a user entity', ->
          user_repository.add_client_to_user user_et.id, new z.client.Client()
          expect(user_et.devices().length).toBe 1

        it 'does not add the same client twice', ->
          first_client = new z.client.Client()
          first_client.id = '5021d77752286cac'

          second_client = new z.client.Client()
          second_client.id = '575b7a890cdb7635'

          user_repository.save_user user_et
          user_repository.add_client_to_user user_et.id, first_client
          user_repository.add_client_to_user user_et.id, second_client
          user_repository.add_client_to_user user_et.id, second_client

          expect(user_et.devices().length).toBe 2

    describe 'fetch_user_by_id', ->
      it 'executes the callback if the array of user_ids only contains undefined', ->
        user_ids = [undefined, undefined, undefined]
        callback = sinon.spy()

        user_repository.fetch_users_by_id user_ids, callback
        expect(callback.called).toBeTruthy()

    describe 'find_user', ->
      user = null

      beforeEach ->
        user = new z.entity.User()
        user.id = entities.user.john_doe.id
        user_repository.save_user user

      afterEach ->
        user_repository.users.removeAll()

      it 'finds an existing user', ->
        user_et = user_repository.find_user user.id
        expect(user_et).toEqual user

      it 'cannot find an unknown user', ->
        expect(user_repository.find_user '1').toBeFalsy()

    describe 'get_user_by_name', ->
      beforeEach ->
        user_et_a = new z.entity.User()
        user_et_a.name 'René'
        user_repository.save_user user_et_a

        user_et_b = new z.entity.User()
        user_et_b.name 'Gregor'
        user_repository.save_user user_et_b

        it 'finds the correct user by searching for the full name', ->
          result = user_repository.get_user_by_name 'Gregor'
          expect(result.length).toBe 1

        it 'finds the correct user by searching for the full name (transliteration)', ->
          result = user_repository.get_user_by_name 'Rene'
          expect(result.length).toBe 1

        it 'finds the correct users', ->
          result = user_repository.get_user_by_name 'e'
          expect(result.length).toBe 2

    describe 'save_user', ->
      it 'saves a user', ->
        user = new z.entity.User()
        user.id = entities.user.jane_roe.id

        user_repository.save_user user

        expect(user_repository.find_user user.id).toBe user
        expect(user_repository.user_exists user.id).toBeTruthy()

      it 'saves self user', ->
        user = new z.entity.User()
        user.id = entities.user.jane_roe.id

        user_repository.save_user user, true

        expect(user_repository.find_user user.id).toBe user
        expect(user_repository.user_exists user.id).toBeTruthy()
        expect(user_repository.self()).toBe user

    describe 'user_exists', ->
      user = null

      beforeEach ->
        user = new z.entity.User entities.user.john_doe.id
        user_repository.save_user user

      afterEach ->
        user_repository.users.removeAll()

      it 'finds an existing user', ->
        expect(user_repository.user_exists user.id).toBeTruthy()

      it 'cannot find an unknown user', ->
        expect(user_repository.user_exists '1').toBeFalsy()

    describe '_assign_all_clients', ->
      user_jane_roe = null
      user_john_doe = null

      beforeEach ->
        user_jane_roe = new z.entity.User entities.user.jane_roe.id
        user_john_doe = new z.entity.User entities.user.john_doe.id
        user_repository.save_users [user_jane_roe, user_john_doe]

        permanent_client = client_repository.client_mapper.map_client entities.clients.john_doe.permanent
        plain_client = client_repository.client_mapper.map_client entities.clients.jane_roe.plain
        temporary_client = client_repository.client_mapper.map_client entities.clients.john_doe.temporary
        user_client_map =
          "#{entities.user.john_doe.id}": [permanent_client, temporary_client]
          "#{entities.user.jane_roe.id}": [plain_client]
        spyOn(client_repository, 'get_all_clients_from_db').and.returnValue Promise.resolve user_client_map

      afterEach ->
        user_repository.users.removeAll()

      it 'assigns all available clients to the users', (done) ->
        user_repository._assign_all_clients()
        .then ->
          expect(client_repository.get_all_clients_from_db).toHaveBeenCalled()
          expect(user_jane_roe.devices().length).toBe 1
          expect(user_jane_roe.devices()[0].id).toBe entities.clients.jane_roe.plain.id
          expect(user_john_doe.devices().length).toBe 2
          expect(user_john_doe.devices()[0].id).toBe entities.clients.john_doe.permanent.id
          expect(user_john_doe.devices()[1].id).toBe entities.clients.john_doe.temporary.id
          done()
        .catch done.fail

    describe 'verify_usernames', ->

      it 'resolves with username when username is not taken', (done) ->
        usernames = ['john_doe']
        server.respondWith 'GET', "#{test_factory.settings.connection.rest_url}/users?handles=#{usernames[0]}", [
          200,
          {'Content-Type': 'application/json'},
          JSON.stringify(usernames)
        ]

        user_repository.verify_usernames usernames
        .then (_usernames) ->
          expect(_usernames).toBe usernames
          done()
        .catch done.fail

      it 'rejects when username is taken', (done) ->
        usernames = ['john_doe']
        server.respondWith 'GET', "#{test_factory.settings.connection.rest_url}/users?handles=#{usernames[0]}", [
          200,
          {'Content-Type': 'application/json'},
          JSON.stringify([])
        ]

        user_repository.verify_usernames usernames
        .then (_usernames) ->
          expect(_usernames.length).toBe 0
          done()
        .catch done.fail

    describe 'verify_username', ->

      it 'resolves with username when username is not taken', (done) ->
        username = 'john_doe'
        server.respondWith 'HEAD', "#{test_factory.settings.connection.rest_url}/users/handles/#{username}", [404, {}, '']

        user_repository.verify_username username
        .then (_username) ->
          expect(_username).toBe username
          done()
        .catch done.fail

      it 'rejects when username is taken', (done) ->
        username = 'john_doe'
        server.respondWith 'HEAD', "#{test_factory.settings.connection.rest_url}/users/handles/#{username}", [200, {}, '']

        user_repository.verify_username username
        .then done.fail
        .catch done
