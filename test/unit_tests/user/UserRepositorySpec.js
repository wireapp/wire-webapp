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

describe('z.user.UserRepository', () => {
  let server = null;
  const test_factory = new TestFactory();

  beforeAll(() => test_factory.exposeUserActors());

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.autoRespond = true;
  });

  afterEach(() => {
    TestFactory.user_repository.users.removeAll();
    server.restore();
  });

  describe('users', () => {
    describe('fetchUsersById', () => {
      it('should handle malformed input', () => {
        return TestFactory.user_repository
          .fetchUsersById()
          .then(response => {
            expect(response.length).toBe(0);
            return TestFactory.user_repository.fetchUsersById([undefined, undefined, undefined]);
          })
          .then(response => {
            expect(response.length).toBe(0);
          });
      });
    });

    describe('findUserById', () => {
      let user = null;

      beforeEach(() => {
        user = new z.entity.User(entities.user.john_doe.id);
        return TestFactory.user_repository.save_user(user);
      });

      afterEach(() => {
        TestFactory.user_repository.users.removeAll();
      });

      it('should find an existing user', () => {
        return TestFactory.user_repository.findUserById(user.id).then(user_et => {
          expect(user_et).toEqual(user);
        });
      });

      it('should not find an unknown user', done => {
        TestFactory.user_repository
          .findUserById('1')
          .then(done.fail)
          .catch(error => {
            expect(error.type).toBe(z.error.UserError.TYPE.USER_NOT_FOUND);
            done();
          });
      });
    });

    describe('save_user', () => {
      afterEach(() => TestFactory.user_repository.users.removeAll());

      it('saves a user', () => {
        const user = new z.entity.User();
        user.id = entities.user.jane_roe.id;

        return TestFactory.user_repository.save_user(user).then(() => {
          expect(TestFactory.user_repository.users().length).toBe(1);
          expect(TestFactory.user_repository.users()[0]).toBe(user);
        });
      });

      it('saves self user', () => {
        const user = new z.entity.User();
        user.id = entities.user.jane_roe.id;

        return TestFactory.user_repository.save_user(user, true).then(() => {
          expect(TestFactory.user_repository.users().length).toBe(1);
          expect(TestFactory.user_repository.users()[0]).toBe(user);
          expect(TestFactory.user_repository.self()).toBe(user);
        });
      });
    });

    describe('_assignAllClients', () => {
      let user_jane_roe = null;
      let user_john_doe = null;

      beforeEach(() => {
        user_jane_roe = new z.entity.User(entities.user.jane_roe.id);
        user_john_doe = new z.entity.User(entities.user.john_doe.id);

        return TestFactory.user_repository.save_users([user_jane_roe, user_john_doe]).then(() => {
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
        });
      });

      afterEach(() => TestFactory.user_repository.users.removeAll());

      it('assigns all available clients to the users', () => {
        return TestFactory.user_repository._assignAllClients().then(() => {
          expect(TestFactory.client_repository.getAllClientsFromDb).toHaveBeenCalled();
          expect(user_jane_roe.devices().length).toBe(1);
          expect(user_jane_roe.devices()[0].id).toBe(entities.clients.jane_roe.plain.id);
          expect(user_john_doe.devices().length).toBe(2);
          expect(user_john_doe.devices()[0].id).toBe(entities.clients.john_doe.permanent.id);
          expect(user_john_doe.devices()[1].id).toBe(entities.clients.john_doe.temporary.id);
        });
      });
    });

    describe('verify_usernames', () => {
      it('resolves with username when username is not taken', () => {
        const usernames = ['john_doe'];
        server.respondWith('POST', `${test_factory.settings.connection.restUrl}/users/handles`, [
          200,
          {'Content-Type': 'application/json'},
          JSON.stringify(usernames),
        ]);

        return TestFactory.user_repository.verify_usernames(usernames).then(_usernames => {
          expect(_usernames).toEqual(usernames);
        });
      });

      it('rejects when username is taken', () => {
        const usernames = ['john_doe'];
        server.respondWith('POST', `${test_factory.settings.connection.restUrl}/users/handles`, [
          200,
          {'Content-Type': 'application/json'},
          JSON.stringify([]),
        ]);

        return TestFactory.user_repository.verify_usernames(usernames).then(_usernames => {
          expect(_usernames.length).toBe(0);
        });
      });
    });

    describe('verify_username', () => {
      it('resolves with username when username is not taken', () => {
        const username = 'john_doe';
        server.respondWith('HEAD', `${test_factory.settings.connection.restUrl}/users/handles/${username}`, [
          404,
          {},
          '',
        ]);

        return TestFactory.user_repository.verify_username(username).then(_username => {
          expect(_username).toBe(username);
        });
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
