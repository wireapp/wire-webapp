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

describe('User Service', () => {
  let server = null;
  const urls = {
    restUrl: 'http://localhost.com',
    websocket_url: 'wss://localhost',
  };
  let connectionService = null;

  beforeEach(() => {
    server = sinon.fakeServer.create();

    const backendClient = new z.service.BackendClient(urls);
    connectionService = new z.connection.ConnectionService(backendClient);
  });

  afterEach(() => server.restore());

  it('can get the users connections', done => {
    const request_url = `${urls.restUrl}/connections?size=500`;
    server.respondWith('GET', request_url, [
      200,
      {'Content-Type': 'application/json'},
      JSON.stringify(payload.connections.get),
    ]);

    connectionService
      .getConnections()
      .then(response => {
        expect(response.has_more).toBeFalsy();
        expect(response.connections.length).toBe(2);
        expect(response.connections[0].status).toEqual('accepted');
        expect(response.connections[1].conversation).toEqual('45c8f986-6c8f-465b-9ac9-bd5405e8c944');
        done();
      })
      .catch(done.fail);

    server.respond();
  });
});
