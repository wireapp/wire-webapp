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

# grunt test_init && grunt test_run:auth/AuthRepository

describe 'z.auth.AuthRepository', ->
  test_factory = new TestFactory()

  beforeAll (done) ->
    test_factory.exposeAuthActors().then(done).catch done.fail

  describe '_schedule_token_refresh', ->

    beforeEach ->
      spyOn auth_repository, 'renew_access_token'
      jasmine.clock().install()

    afterEach ->
      jasmine.clock().uninstall()

    afterAll ->
      jasmine.clock().uninstall()

    it 'renews the access token immediately if expiring in the past', ->
      expiration_timestamp = Date.now() - 30000
      auth_repository._schedule_token_refresh expiration_timestamp
      expect(auth_repository.renew_access_token).toHaveBeenCalled()

    it 'renews the access token immediately if expiring within the next minute', ->
      expiration_timestamp = Date.now() + 30000
      auth_repository._schedule_token_refresh expiration_timestamp
      expect(auth_repository.renew_access_token).toHaveBeenCalled()

    it 'renews the access token at the scheduled time', ->
      expiration_timestamp = Date.now() + 60500
      auth_repository._schedule_token_refresh expiration_timestamp
      expect(auth_repository.renew_access_token).not.toHaveBeenCalled()
      jasmine.clock().tick 1000
      expect(auth_repository.renew_access_token).toHaveBeenCalled()

    it 'clears an existing timeout before scheduling an new refresh', ->
      spyOn(window, 'clearTimeout').and.callThrough()
      first_timestamp = Date.now() + 60500
      second_timestamp = Date.now() + 61000

      auth_repository._schedule_token_refresh first_timestamp
      expect(auth_repository.renew_access_token).not.toHaveBeenCalled()
      jasmine.clock().tick 250
      expect(auth_repository.renew_access_token).not.toHaveBeenCalled()
      auth_repository._schedule_token_refresh second_timestamp
      expect(auth_repository.renew_access_token).not.toHaveBeenCalled()
      expect(window.clearTimeout).toHaveBeenCalled()
      second_timestamp = Date.now() + 60500
      jasmine.clock().tick 1000
      expect(auth_repository.renew_access_token).toHaveBeenCalled()
