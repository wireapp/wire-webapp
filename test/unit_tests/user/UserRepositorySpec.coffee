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

      it 'should return the expected connection for the given conversation id' , ->
        connection_et = user_repository.get_connection_by_conversation_id connection_et_a.conversation_id
        expect(connection_et).toBe connection_et_a

        connection_et = user_repository.get_connection_by_conversation_id ''
        expect(connection_et).not.toBeDefined()

    describe 'get_connections', ->
      # TODO: This test seems to be flaky!
      xit 'should return the connected users', (done) ->
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
      beforeEach (done) ->
        user_et = new z.entity.User()
        user_repository.save_user user_et
        .then done
        .catch done.fail

        it 'adds a client entity to a user entity', ->
          user_repository.add_client_to_user user_et.id, new z.client.Client()
          expect(user_et.devices().length).toBe 1

        it 'does not add the same client twice', (done) ->
          first_client = new z.client.Client()
          first_client.id = '5021d77752286cac'

          second_client = new z.client.Client()
          second_client.id = '575b7a890cdb7635'

          is_new_client = user_repository.add_client_to_user user_et.id, first_client
          expect(is_new_client).toBe true

          is_new_client = user_repository.add_client_to_user user_et.id, second_client
          expect(is_new_client).toBe true

          is_new_client = user_repository.add_client_to_user user_et.id, second_client
          expect(is_new_client).toBe false

          expect(user_et.devices().length).toBe 2

    describe 'fetch_user_by_id', ->
      it 'should handle malformed input', (done) ->
        user_repository.fetch_users_by_id()
        .then (response) ->
          expect(response.length).toBe 0
          return user_repository.fetch_users_by_id [undefined, undefined, undefined]
        .then (response) ->
          expect(response.length).toBe 0
          done()
        .catch done.fail

    describe 'find_user_by_id', ->
      user = null

      beforeEach (done) ->
        user = new z.entity.User()
        user.id = entities.user.john_doe.id
        user_repository.save_user user
        .then done
        .catch done.fail

      afterEach ->
        user_repository.users.removeAll()

      it 'should find an existing user', (done) ->
        user_repository.find_user_by_id user.id
        .then (user_et) ->
          expect(user_et).toEqual user
          done()
        .catch done.fail

      it 'should not find an unknown user', (done) ->
        user_repository.find_user_by_id '1'
        .then done.fail
        .catch (error) ->
          expect(error.type).toBe z.user.UserError::TYPE.USER_NOT_FOUND
          done()

    describe 'search_for_connected_users', ->
      user_et_a = null
      user_et_b = null

      beforeEach (done) ->
        connection_et = new z.entity.Connection()
        connection_et.status z.user.ConnectionStatus.ACCEPTED

        user_et_a = new z.entity.User z.util.create_random_uuid()
        user_et_a.name 'René'
        user_et_a.username 'foo'
        user_et_a.connection connection_et

        user_et_b = new z.entity.User z.util.create_random_uuid()
        user_et_b.name 'Gregor'
        user_et_b.connection connection_et

        user_repository.save_users [user_et_a, user_et_b]
        .then done
        .catch done.fail

      afterEach ->
        user_repository.users.removeAll()

      it 'finds the correct user by searching for the full name', ->
        result = user_repository.search_for_connected_users 'Gregor'
        expect(result.length).toBe 1
        expect(result[0].id).toBe user_et_b.id

      it 'finds the correct user by searching for the full name (transliteration)', ->
        result = user_repository.search_for_connected_users 'Rene'
        expect(result.length).toBe 1
        expect(result[0].id).toBe user_et_a.id

      it 'finds the correct user by searching for the username', ->
        result = user_repository.search_for_connected_users 'foo'
        expect(result.length).toBe 1
        expect(result[0].id).toBe user_et_a.id

      it 'finds the correct users', ->
        result = user_repository.search_for_connected_users 'e'
        expect(result.length).toBe 2
        expect(result[0].id).toBe user_et_b.id
        expect(result[1].id).toBe user_et_a.id

    describe 'save_user', ->
      afterEach ->
        user_repository.users.removeAll()

      it 'saves a user', (done) ->
        user = new z.entity.User()
        user.id = entities.user.jane_roe.id

        user_repository.save_user user
        .then ->
          expect(user_repository.users().length).toBe 1
          expect(user_repository.users()[0]).toBe user
          done()
        .catch done.fail

      it 'saves self user', (done) ->
        user = new z.entity.User()
        user.id = entities.user.jane_roe.id

        user_repository.save_user user, true
        .then ->
          expect(user_repository.users().length).toBe 1
          expect(user_repository.users()[0]).toBe user
          expect(user_repository.self()).toBe user
          done()
        .catch done.fail

    describe '_assign_all_clients', ->
      user_jane_roe = null
      user_john_doe = null

      beforeEach (done) ->
        user_jane_roe = new z.entity.User entities.user.jane_roe.id
        user_john_doe = new z.entity.User entities.user.john_doe.id
        user_repository.save_users [user_jane_roe, user_john_doe]
        .then ->
          permanent_client = client_repository.client_mapper.map_client entities.clients.john_doe.permanent
          plain_client = client_repository.client_mapper.map_client entities.clients.jane_roe.plain
          temporary_client = client_repository.client_mapper.map_client entities.clients.john_doe.temporary
          user_client_map =
            "#{entities.user.john_doe.id}": [permanent_client, temporary_client]
            "#{entities.user.jane_roe.id}": [plain_client]
          spyOn(client_repository, 'get_all_clients_from_db').and.returnValue Promise.resolve user_client_map
          done()
        .catch done.fail

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
        server.respondWith 'POST', "#{test_factory.settings.connection.rest_url}/users/handles", [
          200,
          'Content-Type': 'application/json',
          JSON.stringify usernames
        ]

        user_repository.verify_usernames usernames
        .then (_usernames) ->
          expect(_usernames).toEqual usernames
          done()
        .catch done.fail

      it 'rejects when username is taken', (done) ->
        usernames = ['john_doe']
        server.respondWith 'POST', "#{test_factory.settings.connection.rest_url}/users/handles", [
          200,
          'Content-Type': 'application/json',
          JSON.stringify []
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
