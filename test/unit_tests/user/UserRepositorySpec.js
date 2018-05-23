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

// grunt test_init && grunt test_run:user/UserRepository

'use strict';

describe('z.user.UserRepository', () => {
  let server = null;
  const test_factory = new TestFactory();

  beforeAll(done => {
    test_factory
      .exposeUserActors()
      .then(done)
      .catch(done.fail);
  });

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.autoRespond = true;
  });

  afterEach(() => {
    TestFactory.user_repository.users.removeAll();
    server.restore();
  });

  describe('connections', () => {
    describe('cancel_connection_request', () => {
      let user_et = undefined;

      beforeEach(() => {
        const connection_et = new z.entity.Connection(z.util.createRandomUuid());
        connection_et.to = entities.user.jane_roe.id;

        user_et = new z.entity.User(entities.user.john_doe.id);
        user_et.connection(connection_et);

        TestFactory.user_repository.connections.push(connection_et);
        spyOn(TestFactory.user_repository, '_update_connection_status').and.returnValue(Promise.resolve());
      });

      it('sets the connection status to cancelled', done => {
        TestFactory.user_repository
          .cancelConnectionRequest(user_et)
          .then(() => {
            expect(TestFactory.user_repository._update_connection_status).toHaveBeenCalled();
            done();
          })
          .catch(done.fail);
      });

      it('it switches the conversation if requested', done => {
        const spy = jasmine.createSpy('conversation_show');
        amplify.subscribe(z.event.WebApp.CONVERSATION.SHOW, spy);

        TestFactory.user_repository
          .cancelConnectionRequest(user_et, new z.entity.Conversation())
          .then(() => {
            expect(TestFactory.user_repository._update_connection_status).toHaveBeenCalled();
            expect(spy).toHaveBeenCalled();
            done();
          })
          .catch(done.fail);
      });
    });

    describe('get_connection_by_conversation_id', () => {
      let connection_et_a = null;
      let connection_et_b = null;

      beforeEach(() => {
        connection_et_a = new z.entity.Connection();
        connection_et_a.conversation_id = '874d2afe-821d-4f8c-9d3d-3b0fea948e43';
        TestFactory.user_repository.connections.push(connection_et_a);
        connection_et_b = new z.entity.Connection();
        connection_et_a.conversation_id = 'a8566a3b-0f24-448e-a0dc-85992c140fb5';
        TestFactory.user_repository.connections.push(connection_et_b);
      });

      afterEach(() => {
        TestFactory.user_repository.connections.removeAll();
      });

      it('should return the expected connection for the given conversation id', () => {
        let connection_et = TestFactory.user_repository.get_connection_by_conversation_id(
          connection_et_a.conversation_id
        );
        expect(connection_et).toBe(connection_et_a);

        connection_et = TestFactory.user_repository.get_connection_by_conversation_id('');
        expect(connection_et).not.toBeDefined();
      });
    });

    describe('get_connections', () => {
      // TODO: This test seems to be flaky!
      xit('should return the connected users', done => {
        server.respondWith('GET', `${test_factory.settings.connection.restUrl}/connections?size=500`, [
          200,
          {'Content-Type': 'application/json'},
          JSON.stringify(payload.connections.get),
        ]);

        server.respondWith(
          'GET',
          `${test_factory.settings.connection.restUrl}/users?ids=${entities.user.jane_roe.id}%2C${
            entities.user.jane_roe.id
          }`,
          [200, {'Content-Type': 'application/json'}, JSON.stringify(payload.users.get.many)]
        );

        TestFactory.user_repository
          .get_connections()
          .then(() => {
            expect(TestFactory.user_repository.connections().length).toBe(2);
            expect(TestFactory.user_repository.connections()[0].status()).toEqual(z.user.ConnectionStatus.ACCEPTED);
            expect(TestFactory.user_repository.connections()[1].conversation_id).toEqual(
              '45c8f986-6c8f-465b-9ac9-bd5405e8c944'
            );
            done();
          })
          .catch(done.fail);
      });
    });
  });

  describe('users', () => {
    describe('fetch_user_by_id', () => {
      it('should handle malformed input', done => {
        TestFactory.user_repository
          .fetch_users_by_id()
          .then(response => {
            expect(response.length).toBe(0);
            return TestFactory.user_repository.fetch_users_by_id([undefined, undefined, undefined]);
          })
          .then(response => {
            expect(response.length).toBe(0);
            done();
          })
          .catch(done.fail);
      });
    });

    describe('findUserById', () => {
      let user = null;

      beforeEach(done => {
        user = new z.entity.User();
        user.id = entities.user.john_doe.id;
        TestFactory.user_repository
          .save_user(user)
          .then(done)
          .catch(done.fail);
      });

      afterEach(() => {
        TestFactory.user_repository.users.removeAll();
      });

      it('should find an existing user', done => {
        TestFactory.user_repository
          .findUserById(user.id)
          .then(user_et => {
            expect(user_et).toEqual(user);
            done();
          })
          .catch(done.fail);
      });

      it('should not find an unknown user', done => {
        TestFactory.user_repository
          .findUserById('1')
          .then(done.fail)
          .catch(error => {
            expect(error.type).toBe(z.user.UserError.TYPE.USER_NOT_FOUND);
            done();
          });
      });
    });

    describe('search_for_connected_users', () => {
      let user_et_a = null;
      let user_et_b = null;

      beforeEach(done => {
        const connection_et = new z.entity.Connection();
        connection_et.status(z.user.ConnectionStatus.ACCEPTED);

        user_et_a = new z.entity.User(z.util.createRandomUuid());
        user_et_a.name('René');
        user_et_a.username('foo');
        user_et_a.connection(connection_et);

        user_et_b = new z.entity.User(z.util.createRandomUuid());
        user_et_b.name('Gregor');
        user_et_b.connection(connection_et);

        TestFactory.user_repository
          .save_users([user_et_a, user_et_b])
          .then(done)
          .catch(done.fail);
      });

      afterEach(() => {
        TestFactory.user_repository.users.removeAll();
      });

      it('finds the correct user by searching for the full name', () => {
        const result = TestFactory.user_repository.search_for_connected_users('Gregor');
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(user_et_b.id);
      });

      it('finds the correct user by searching for the full name (transliteration)', () => {
        const result = TestFactory.user_repository.search_for_connected_users('Rene');
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(user_et_a.id);
      });

      it('finds the correct user by searching for the username', () => {
        const result = TestFactory.user_repository.search_for_connected_users('foo');
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(user_et_a.id);
      });

      it('finds the correct users', () => {
        const result = TestFactory.user_repository.search_for_connected_users('e');
        expect(result.length).toBe(2);
        expect(result[0].id).toBe(user_et_b.id);
        expect(result[1].id).toBe(user_et_a.id);
      });
    });

    describe('save_user', () => {
      afterEach(() => {
        TestFactory.user_repository.users.removeAll();
      });

      it('saves a user', done => {
        const user = new z.entity.User();
        user.id = entities.user.jane_roe.id;

        TestFactory.user_repository
          .save_user(user)
          .then(() => {
            expect(TestFactory.user_repository.users().length).toBe(1);
            expect(TestFactory.user_repository.users()[0]).toBe(user);
            done();
          })
          .catch(done.fail);
      });

      it('saves self user', done => {
        const user = new z.entity.User();
        user.id = entities.user.jane_roe.id;

        TestFactory.user_repository
          .save_user(user, true)
          .then(() => {
            expect(TestFactory.user_repository.users().length).toBe(1);
            expect(TestFactory.user_repository.users()[0]).toBe(user);
            expect(TestFactory.user_repository.self()).toBe(user);
            done();
          })
          .catch(done.fail);
      });
    });

    describe('_assignAllClients', () => {
      let user_jane_roe = null;
      let user_john_doe = null;

      beforeEach(done => {
        user_jane_roe = new z.entity.User(entities.user.jane_roe.id);
        user_john_doe = new z.entity.User(entities.user.john_doe.id);

        TestFactory.user_repository
          .save_users([user_jane_roe, user_john_doe])
          .then(() => {
            const permanent_client = TestFactory.client_repository.clientMapper.mapClient(
              entities.clients.john_doe.permanent
            );
            const plain_client = TestFactory.client_repository.clientMapper.mapClient(entities.clients.jane_roe.plain);
            const temporary_client = TestFactory.client_repository.clientMapper.mapClient(
              entities.clients.john_doe.temporary
            );
            const recipients = {
              [entities.user.john_doe.id]: [permanent_client, temporary_client],
              [entities.user.jane_roe.id]: [plain_client],
            };

            spyOn(TestFactory.client_repository, 'getAllClientsFromDb').and.returnValue(Promise.resolve(recipients));
            done();
          })
          .catch(done.fail);
      });

      afterEach(() => {
        TestFactory.user_repository.users.removeAll();
      });

      it('assigns all available clients to the users', done => {
        TestFactory.user_repository
          ._assignAllClients()
          .then(() => {
            expect(TestFactory.client_repository.getAllClientsFromDb).toHaveBeenCalled();
            expect(user_jane_roe.devices().length).toBe(1);
            expect(user_jane_roe.devices()[0].id).toBe(entities.clients.jane_roe.plain.id);
            expect(user_john_doe.devices().length).toBe(2);
            expect(user_john_doe.devices()[0].id).toBe(entities.clients.john_doe.permanent.id);
            expect(user_john_doe.devices()[1].id).toBe(entities.clients.john_doe.temporary.id);
            done();
          })
          .catch(done.fail);
      });
    });

    describe('verify_usernames', () => {
      it('resolves with username when username is not taken', done => {
        const usernames = ['john_doe'];
        server.respondWith('POST', `${test_factory.settings.connection.restUrl}/users/handles`, [
          200,
          {'Content-Type': 'application/json'},
          JSON.stringify(usernames),
        ]);

        TestFactory.user_repository
          .verify_usernames(usernames)
          .then(_usernames => {
            expect(_usernames).toEqual(usernames);
            done();
          })
          .catch(done.fail);
      });

      it('rejects when username is taken', done => {
        const usernames = ['john_doe'];
        server.respondWith('POST', `${test_factory.settings.connection.restUrl}/users/handles`, [
          200,
          {'Content-Type': 'application/json'},
          JSON.stringify([]),
        ]);

        TestFactory.user_repository
          .verify_usernames(usernames)
          .then(_usernames => {
            expect(_usernames.length).toBe(0);
            done();
          })
          .catch(done.fail);
      });
    });

    describe('verify_username', () => {
      it('resolves with username when username is not taken', done => {
        const username = 'john_doe';
        server.respondWith('HEAD', `${test_factory.settings.connection.restUrl}/users/handles/${username}`, [
          404,
          {},
          '',
        ]);

        TestFactory.user_repository
          .verify_username(username)
          .then(_username => {
            expect(_username).toBe(username);
            done();
          })
          .catch(done.fail);
      });

      it('rejects when username is taken', done => {
        const username = 'john_doe';
        server.respondWith('HEAD', `${test_factory.settings.connection.restUrl}/users/handles/${username}`, [
          200,
          {},
          '',
        ]);

        TestFactory.user_repository
          .verify_username(username)
          .then(done.fail)
          .catch(() => done());
      });
    });
  });
});
