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

// grunt test_init && grunt test_run:user/UserService

'use strict';

describe('User Service', () => {
  let server = null;
  const urls = {
    restUrl: 'http://localhost.com',
    websocket_url: 'wss://localhost',
  };
  let userService = null;

  beforeEach(() => {
    server = sinon.fakeServer.create();

    const backendClient = new z.service.BackendClient(urls);
    userService = new z.user.UserService(backendClient);
  });

  afterEach(() => server.restore());

  describe('getUsers', () => {
    it('can get a single existing user from the server', done => {
      const request_url = `${urls.restUrl}/users?ids=7025598b-ffac-4993-8a81-af3f35b7147f`;
      server.respondWith('GET', request_url, [
        200,
        {'Content-Type': 'application/json'},
        JSON.stringify(payload.users.get.one),
      ]);

      userService
        .getUsers(['7025598b-ffac-4993-8a81-af3f35b7147f'])
        .then(response => {
          expect(response.length).toBe(1);
          expect(response[0].id).toBe('d5a39ffb-6ce3-4cc8-9048-0e15d031b4c5');
          done();
        })
        .catch(done.fail);

      server.respond();
    });

    it('cannot get a single fake user from the server', done => {
      const request_url = `${urls.restUrl}/users?ids=7025598b-ffac-4993-8a81-af3f35b71414`;
      server.respondWith('GET', request_url, [404, {'Content-Type': 'application/json'}, '']);

      userService
        .getUsers(['7025598b-ffac-4993-8a81-af3f35b71414'])
        .then(done.fail)
        .catch(error => {
          expect(error.code).toBe(z.error.BackendClientError.STATUS_CODE.NOT_FOUND);
          done();
        });

      server.respond();
    });

    it('can get multiple existing users from the server', done => {
      const request_url = `${
        urls.restUrl
      }/users?ids=7025598b-ffac-4993-8a81-af3f35b7147f%2C7025598b-ffac-4993-8a81-af3f35b71414`;
      server.respondWith('GET', request_url, [
        200,
        {'Content-Type': 'application/json'},
        JSON.stringify(payload.users.get.many),
      ]);

      userService
        .getUsers(['7025598b-ffac-4993-8a81-af3f35b7147f', '7025598b-ffac-4993-8a81-af3f35b71414'])
        .then(response => {
          expect(response.length).toBe(2);
          expect(response[0].id).toBe('d5a39ffb-6ce3-4cc8-9048-0e15d031b4c5');
          done();
        })
        .catch(done.fail);

      server.respond();
    });

    it('cannot fetch multiple fake users from the server', done => {
      const request_url = `${
        urls.restUrl
      }/users?ids=7025598b-ffac-4993-8a81-af3f35b71488%2C7025598b-ffac-4993-8a81-af3f35b71414`;
      server.respondWith('GET', request_url, [404, {'Content-Type': 'application/json'}, '']);

      userService
        .getUsers(['7025598b-ffac-4993-8a81-af3f35b71488', '7025598b-ffac-4993-8a81-af3f35b71414'])
        .then(done.fail)
        .catch(error => {
          expect(error.code).toBe(z.error.BackendClientError.STATUS_CODE.NOT_FOUND);
          done();
        });

      server.respond();
    });

    it('can fetch the existing users from the servers in a group with fakes', done => {
      const request_url = `${
        urls.restUrl
      }/users?ids=d5a39ffb-6ce3-4cc8-9048-0e15d031b4c5%2C7025598b-ffac-4993-8a81-af3f35b71425`;
      server.respondWith('GET', request_url, [
        200,
        {'Content-Type': 'application/json'},
        JSON.stringify(payload.users.get.one),
      ]);

      userService
        .getUsers(['d5a39ffb-6ce3-4cc8-9048-0e15d031b4c5', '7025598b-ffac-4993-8a81-af3f35b71425'])
        .then(response => {
          expect(response.length).toBe(1);
          expect(response[0].id).toBe('d5a39ffb-6ce3-4cc8-9048-0e15d031b4c5');
          done();
        })
        .catch(done.fail);

      server.respond();
    });
  });
});
