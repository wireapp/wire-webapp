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

import {amplify} from 'amplify';
import {resolve, graph} from './../../api/testResolver';
import {WebAppEvents} from 'src/script/event/WebApp';

describe('BackendClient', () => {
  let backendClient = null;
  let server = null;

  beforeEach(() => {
    backendClient = resolve(graph.BackendClient);
  });

  afterEach(() => {
    backendClient = null;
  });

  describe('executeOnConnectivity', () => {
    beforeEach(() => {
      jasmine.clock().install();
      server = sinon.fakeServer.create();
      spyOn(backendClient, 'status').and.callThrough();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
      server.restore();
    });

    it('executes callback when backend status is ok', done => {
      backendClient
        .executeOnConnectivity()
        .then(() => {
          expect(backendClient.status).toHaveBeenCalled();
          expect(backendClient.status).toHaveBeenCalledTimes(1);
          done();
        })
        .catch(done.fail);

      jasmine.clock().tick(10);
      server.requests[0].respond(200);
    });

    it('executes callback when backend status return an error', done => {
      backendClient
        .executeOnConnectivity()
        .then(() => {
          expect(backendClient.status).toHaveBeenCalled();
          expect(backendClient.status).toHaveBeenCalledTimes(1);
          done();
        })
        .catch(done.fail);

      jasmine.clock().tick(10);
      server.requests[0].respond(401);
    });

    it('does not execute callback when request times out', done => {
      backendClient
        .executeOnConnectivity()
        .then(response => done.fail(response))
        .catch(done.fail);

      jasmine.clock().tick(250);

      expect(backendClient.status).toHaveBeenCalled();
      expect(backendClient.status).toHaveBeenCalledTimes(1);
      jasmine.clock().tick(2500);

      expect(backendClient.status).toHaveBeenCalledTimes(2);
      done();
    });

    it('executes callback when it retries after failure', done => {
      backendClient
        .executeOnConnectivity()
        .then(() => {
          expect(backendClient.status).toHaveBeenCalledTimes(2);
          done();
        })
        .catch(done.fail);

      jasmine.clock().tick(500);

      expect(backendClient.status).toHaveBeenCalled();
      expect(backendClient.status).toHaveBeenCalledTimes(1);
      jasmine.clock().tick(2100);

      expect(backendClient.status).toHaveBeenCalledTimes(2);
      server.requests[1].respond(401);
    });

    it('does not execute the callback when it retries after failure and fails again', done => {
      backendClient
        .executeOnConnectivity()
        .then(response => done.fail(response))
        .catch(done.fail);

      jasmine.clock().tick(750);

      expect(backendClient.status).toHaveBeenCalled();
      jasmine.clock().tick(2500);

      expect(backendClient.status).toHaveBeenCalledTimes(2);
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
      backendClient.requestQueue.pause();
      jasmine.clock().install();
      server = sinon.fakeServer.create();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
      server.restore();
    });

    it('should resolve with the request payload', done => {
      backendClient
        ._sendRequest(config)
        .then(done)
        .catch(done.fail);
      server.requests[0].respond(200);
    });

    it('should cache the request if it was unauthorized', done => {
      const tokenRefresh = () => {
        expect(backendClient.requestQueue.getLength()).toBe(1);
        done();
      };
      amplify.subscribe(WebAppEvents.CONNECTION.ACCESS_TOKEN.RENEW, tokenRefresh);

      backendClient
        ._sendRequest(config)
        .then(response => done.fail(response))
        .catch(done.fail);
      server.requests[0].respond(401);
    });

    it('should cache the request if it timed out', done => {
      spyOn(backendClient, 'executeOnConnectivity').and.returnValue(Promise.resolve());

      backendClient
        ._sendRequest(config)
        .then(response => done.fail(response))
        .catch(done.fail);

      jasmine.clock().tick(150);

      expect(backendClient.requestQueue.getLength()).toBe(1);
      expect(backendClient.executeOnConnectivity).toHaveBeenCalled();
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
      spyOn(backendClient, 'sendRequest').and.callFake(config => {
        expect(config.callback).toBe(original_config.callback);
        expect(config.contentType).toBe('application/json; charset=utf-8');
        expect(config.headers['X-TEST-HEADER']).toBe(original_config.headers['X-TEST-HEADER']);
        expect(config.data).toBeDefined();
        expect(config.processData).toBe(original_config.processData);
        expect(config.timeout).toBe(original_config.timeout);
        expect(config.type).toBe(original_config.type);
        expect(config.url).toBe(original_config.url);
        expect(config.withCredentials).toBe(original_config.withCredentials);
        done();
      });

      backendClient.sendJson(original_config);
    });
  });
});
