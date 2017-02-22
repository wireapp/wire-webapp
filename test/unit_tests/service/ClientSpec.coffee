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

# grunt test_init && grunt test_run:service/Client

describe 'z.service.Client', ->

  client = null
  server = null

  urls =
    rest_url: 'http://localhost'
    websocket_url: 'wss://localhost'

  beforeEach ->
    client = new z.service.Client urls
    client.logger.level = client.logger.levels.ERROR

  afterEach ->
    client = null

  describe 'execute_on_connectivity', ->

    beforeEach ->
      jasmine.clock().install()
      server = sinon.fakeServer.create()
      spyOn(client, 'status').and.callThrough()

    afterEach ->
      jasmine.clock().uninstall()
      server.restore()

    it 'executes callback when backend status is ok', (done) ->
      client.execute_on_connectivity()
      .then ->
        expect(client.status).toHaveBeenCalled()
        expect(client.status).toHaveBeenCalledTimes 1
        done()
      .catch done.fail
      server.requests[0].respond 200

    it 'executes callback when backend status return an error', (done) ->
      client.execute_on_connectivity()
      .then ->
        expect(client.status).toHaveBeenCalled()
        expect(client.status).toHaveBeenCalledTimes 1
        done()
      .catch done.fail
      server.requests[0].respond 401

    it 'does not execute callback when request times out', (done) ->
      client.execute_on_connectivity()
      .then (response) ->
        done.fail response
      .catch done.fail

      jasmine.clock().tick 250
      expect(client.status).toHaveBeenCalled()
      expect(client.status).toHaveBeenCalledTimes 1
      jasmine.clock().tick 2500
      expect(client.status).toHaveBeenCalledTimes 2
      done()

    it 'executes callback when it retries after failure', (done) ->
      client.execute_on_connectivity()
      .then ->
        expect(client.status).toHaveBeenCalledTimes 2
        done()
      .catch done.fail

      jasmine.clock().tick 500
      expect(client.status).toHaveBeenCalled()
      expect(client.status).toHaveBeenCalledTimes 1
      jasmine.clock().tick 2100
      expect(client.status).toHaveBeenCalledTimes 2
      server.requests[1].respond 401

    it 'does not execute the callback when it retries after failure and fails again', (done) ->
      client.execute_on_connectivity()
      .then(done.fail).catch done.fail

      jasmine.clock().tick 750
      expect(client.status).toHaveBeenCalled()
      jasmine.clock().tick 2500
      expect(client.status).toHaveBeenCalledTimes 2
      done()

  describe 'send_request', ->
    config = undefined
    url = "http://localhost/user"

    describe 'requests that use ajax().done()/fail()', ->

      beforeAll ->
        config =
          timeout: 100
          type: 'GET'
          url: url

      beforeEach ->
        jasmine.clock().install()
        server = sinon.fakeServer.create()

      afterEach ->
        jasmine.clock().uninstall()
        server.restore()

      it 'resolves with the payload if backend request successful', (done) ->
        client.send_request config
        .then ->
          done()
        .catch done.fail
        server.requests[0].respond 200

      it 'caches the request if it is unauthorized', (done) ->
        token_refresh = jasmine.createSpy('token_refresh');
        amplify.subscribe z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEW, token_refresh

        client.send_request config
        .then(done.fail).catch done.fail
        server.requests[0].respond 401

        jasmine.clock().tick 750
        expect(client.request_queue.length).toBe 1
        expect(token_refresh).toHaveBeenCalled()
        done()

      it 'caches the request if it times out', (done) ->
        spyOn(client, 'execute_on_connectivity').and.returnValue Promise.resolve()

        client.send_request config
        .then(done.fail).catch done.fail

        jasmine.clock().tick 150
        expect(client.request_queue.length).toBe 1
        expect(client.execute_on_connectivity).toHaveBeenCalled()
        done()

    describe 'send_json', ->
      original_config = undefined

      beforeEach ->
        original_config =
          callback: -> 'callback'
          data: 'data'
          headers:
            'X-TEST-HEADER': 'header'
          processData: true
          timeout: 100
          type: 'GET'
          url: 'dummy/url'
          withCredentials: true

      it 'passes all params to send_request', (done) ->
        spyOn(client, 'send_request').and.callFake (config) ->
          expect(config.callback).toBe original_config.callback
          expect(config.contentType).toBe 'application/json; charset=utf-8'
          expect(config.headers['X-TEST-HEADER']).toBe original_config.headers['X-TEST-HEADER']
          expect(config.headers['Content-Encoding']).toBe 'gzip'
          expect(config.data).toBeDefined()
          expect(config.processData).toBe original_config.processData
          expect(config.timeout).toBe original_config.timeout
          expect(config.type).toBe original_config.type
          expect(config.url).toBe original_config.url
          expect(config.withCredentials).toBe original_config.withCredentials
          done()
        client.send_json(original_config).catch(done.fail)

    # TODO: The tests in the following "describe" block change timings which is unfortunate.
    # That's why this block comes at the end of this file.
    describe 'requests that use ajax().always()', ->

      beforeAll ->
        config =
          callback: []
          timeout: 100
          type: 'GET'
          url: url

      beforeEach ->
        jasmine.clock().install()
        server = sinon.fakeServer.create()

      afterEach ->
        jasmine.clock().uninstall()
        server.restore()

      it 'resolves with the payload if backend request successful', (done) ->
        client.send_request config
        .then(done).catch done.fail
        server.requests[0].respond 200

      it 'caches the request if it is unauthorized', (done) ->
        token_refresh = jasmine.createSpy 'token_refresh'
        amplify.subscribe z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEW, token_refresh

        client.send_request config
        .then(done.fail).catch done.fail
        server.requests[0].respond 401

        jasmine.clock().tick 750
        expect(client.request_queue.length).toBe 1
        expect(token_refresh).toHaveBeenCalled()
        done()

      it 'caches the request if it times out', (done) ->
        spyOn(client, 'execute_on_connectivity').and.returnValue Promise.resolve()

        client.send_request config
        .then(done.fail).catch done.fail

        jasmine.clock().tick 150
        expect(client.request_queue.length).toBe 1
        expect(client.execute_on_connectivity).toHaveBeenCalled()
        done()
