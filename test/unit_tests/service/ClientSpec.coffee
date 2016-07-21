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

      it 'it resolves with the payload if backend request successful', (done) ->
        client.send_request config
        .then ->
          done()
        .catch done.fail
        server.requests[0].respond 200

      it 'it caches the request if it is unauthorized', (done) ->
        token_refresh = jasmine.createSpy('token_refresh');
        amplify.subscribe z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEW, token_refresh

        client.send_request config
        .then(done.fail).catch done.fail
        server.requests[0].respond 401

        jasmine.clock().tick 750
        expect(client.request_queue.length).toBe 1
        expect(token_refresh).toHaveBeenCalled()
        done()

      it 'it caches the request if it times out', (done) ->
        spyOn(client, 'execute_on_connectivity').and.returnValue Promise.resolve()

        client.send_request config
        .then(done.fail).catch done.fail

        jasmine.clock().tick 150
        expect(client.request_queue.length).toBe 1
        expect(client.execute_on_connectivity).toHaveBeenCalled()
        done()

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

      it 'it resolves with the payload if backend request successful', (done) ->
        client.send_request config
        .then(done).catch done.fail
        server.requests[0].respond 200

      it 'it caches the request if it is unauthorized', (done) ->
        token_refresh = jasmine.createSpy 'token_refresh'
        amplify.subscribe z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEW, token_refresh

        client.send_request config
        .then(done.fail).catch done.fail
        server.requests[0].respond 401

        jasmine.clock().tick 750
        expect(client.request_queue.length).toBe 1
        expect(token_refresh).toHaveBeenCalled()
        done()

      it 'it caches the request if it times out', (done) ->
        spyOn(client, 'execute_on_connectivity').and.returnValue Promise.resolve()

        client.send_request config
        .then(done.fail).catch done.fail

        jasmine.clock().tick 150
        expect(client.request_queue.length).toBe 1
        expect(client.execute_on_connectivity).toHaveBeenCalled()
        done()
