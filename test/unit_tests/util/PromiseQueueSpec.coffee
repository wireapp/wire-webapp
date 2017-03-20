#
# Wire
# Copyright (C) 2017 Wire Swiss GmbH
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

# grunt test_init && grunt test_run:util/PromiseQueue

describe 'PromiseQueue', ->

  describe 'push', ->

    it 'should process promises', (done) ->
      counter = 0
      result = []

      promise_fn = ->
        result.push counter++
        return Promise.resolve()

      queue = new z.util.PromiseQueue()
      queue.push promise_fn
      queue.push promise_fn
      queue.push promise_fn
      .then ->
        expect(result).toEqual [0, 1, 2]
        done()

    it 'should process promises that are added during execution', (done) ->
      counter = 0
      result = []

      promise =
        fn: ->
          return new Promise (resolve) ->
            setTimeout ->
              result.push counter++
              resolve()
            , 50

      spyOn(promise, 'fn').and.callThrough()

      queue = new z.util.PromiseQueue()
      queue.push promise.fn

      setTimeout ->
        queue.push promise.fn
        .then ->
          expect(promise.fn.calls.count()).toEqual 2
          expect(result).toEqual [0, 1]
          done()
        .catch done.fail
      , 25

    it 'should process promises even when one of them rejects', (done) ->

      resolving_promise = ->
        return Promise.resolve()

      rejecting_promise = ->
        return Promise.reject()

      queue = new z.util.PromiseQueue()
      queue.push rejecting_promise
      queue.push resolving_promise
      .then done

    it 'should process promises even when one of them times out (with retries)', (done) ->
      counter = 0

      resolving_promise = ->
        return Promise.resolve counter++

      timeout_promise = ->
        return new Promise (resolve) ->
          resolve() if counter++ is 3

      queue = new z.util.PromiseQueue timeout: 100
      queue.push timeout_promise
      queue.push resolving_promise
      .then done
