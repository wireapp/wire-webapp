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

// grunt test_init && grunt test_run:service/BackendClient

'use strict';

describe('z.service.BackendClient', () => {
  let backend_client = null;
  let server = null;

  const urls = {
    restUrl: 'http://localhost',
    websocket_url: 'wss://localhost',
  };

  beforeEach(() => {
    backend_client = new z.service.BackendClient(urls);
  });

  afterEach(() => {
    backend_client = null;
  });

  describe('executeOnConnectivity', () => {
    beforeEach(() => {
      jasmine.clock().install();
      server = sinon.fakeServer.create();
      spyOn(backend_client, 'status').and.callThrough();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
      server.restore();
    });

    it('executes callback when backend status is ok', done => {
      backend_client
        .executeOnConnectivity()
        .then(() => {
          expect(backend_client.status).toHaveBeenCalled();
          expect(backend_client.status).toHaveBeenCalledTimes(1);
          done();
        })
        .catch(done.fail);

      jasmine.clock().tick(10);
      server.requests[0].respond(200);
    });

    it('executes callback when backend status return an error', done => {
      backend_client
        .executeOnConnectivity()
        .then(() => {
          expect(backend_client.status).toHaveBeenCalled();
          expect(backend_client.status).toHaveBeenCalledTimes(1);
          done();
        })
        .catch(done.fail);

      jasmine.clock().tick(10);
      server.requests[0].respond(401);
    });

    it('does not execute callback when request times out', done => {
      backend_client
        .executeOnConnectivity()
        .then(response => done.fail(response))
        .catch(done.fail);

      jasmine.clock().tick(250);

      expect(backend_client.status).toHaveBeenCalled();
      expect(backend_client.status).toHaveBeenCalledTimes(1);
      jasmine.clock().tick(2500);

      expect(backend_client.status).toHaveBeenCalledTimes(2);
      done();
    });

    it('executes callback when it retries after failure', done => {
      backend_client
        .executeOnConnectivity()
        .then(() => {
          expect(backend_client.status).toHaveBeenCalledTimes(2);
          done();
        })
        .catch(done.fail);

      jasmine.clock().tick(500);

      expect(backend_client.status).toHaveBeenCalled();
      expect(backend_client.status).toHaveBeenCalledTimes(1);
      jasmine.clock().tick(2100);

      expect(backend_client.status).toHaveBeenCalledTimes(2);
      server.requests[1].respond(401);
    });

    it('does not execute the callback when it retries after failure and fails again', done => {
      backend_client
        .executeOnConnectivity()
        .then(response => done.fail(response))
        .catch(done.fail);

      jasmine.clock().tick(750);

      expect(backend_client.status).toHaveBeenCalled();
      jasmine.clock().tick(2500);

      expect(backend_client.status).toHaveBeenCalledTimes(2);
      done();
    });
  });

  describe('_sendRequest', () => {
    let config = undefined;

    beforeAll(() => {
      config = {
        timeout: 100,
        type: 'GET',
        url: '/users',
      };
    });

    beforeEach(() => {
      backend_client.requestQueue.pause();
      jasmine.clock().install();
      server = sinon.fakeServer.create();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
      server.restore();
    });

    it('should resolve with the request payload', done => {
      backend_client
        ._sendRequest(config)
        .then(done)
        .catch(done.fail);
      server.requests[0].respond(200);
    });

    it('should cache the request if it was unauthorized', done => {
      const token_refresh = jasmine.createSpy('token_refresh');
      amplify.subscribe(z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEW, token_refresh);

      backend_client
        ._sendRequest(config)
        .then(response => done.fail(response))
        .catch(done.fail);
      server.requests[0].respond(401);

      jasmine.clock().tick(750);

      expect(backend_client.requestQueue.getLength()).toBe(1);
      expect(token_refresh).toHaveBeenCalled();
      done();
    });

    it('should cache the request if it timed out', done => {
      spyOn(backend_client, 'executeOnConnectivity').and.returnValue(Promise.resolve());

      backend_client
        ._sendRequest(config)
        .then(response => done.fail(response))
        .catch(done.fail);

      jasmine.clock().tick(150);

      expect(backend_client.requestQueue.getLength()).toBe(1);
      expect(backend_client.executeOnConnectivity).toHaveBeenCalled();
      done();
    });
  });

  describe('sendJson', () => {
    let original_config = undefined;

    beforeEach(() => {
      original_config = {
        data: 'data',
        headers: {
          'X-TEST-HEADER': 'header',
        },
        processData: true,
        timeout: 100,
        type: 'GET',
        url: 'dummy/url',
        withCredentials: true,
      };
    });

    it('passes all params to sendRequest', done => {
      spyOn(backend_client, 'sendRequest').and.callFake(config => {
        expect(config.callback).toBe(original_config.callback);
        expect(config.contentType).toBe('application/json; charset=utf-8');
        expect(config.headers['X-TEST-HEADER']).toBe(original_config.headers['X-TEST-HEADER']);
        expect(config.headers['Content-Encoding']).toBe('gzip');
        expect(config.data).toBeDefined();
        expect(config.processData).toBe(original_config.processData);
        expect(config.timeout).toBe(original_config.timeout);
        expect(config.type).toBe(original_config.type);
        expect(config.url).toBe(original_config.url);
        expect(config.withCredentials).toBe(original_config.withCredentials);
        done();
      });

      backend_client.sendJson(original_config);
    });
  });
});
