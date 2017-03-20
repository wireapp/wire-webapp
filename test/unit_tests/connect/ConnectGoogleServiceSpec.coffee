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

# grunt test_init && grunt test_run:connect/ConnectGoogleService

describe 'z.connect.ConnectGoogleService', ->
  test_factory = new TestFactory()

  beforeAll (done) ->
    test_factory.exposeConnectActors().then(done).catch done.fail

  describe 'get_contacts', ->
    access_token = 'access_token'

    beforeEach ->
      spyOn(connect_google_service, '_init_library').and.callThrough()
      spyOn(connect_google_service, '_load_library').and.returnValue Promise.resolve()
      spyOn(connect_google_service, '_get_contacts').and.returnValue Promise.resolve()

    it 'initializes the authentication library if previously was not', (done) ->
      spyOn(connect_google_service, '_get_access_token').and.returnValue Promise.resolve()

      connect_google_service.get_contacts()
      .then ->
        expect(connect_google_service._init_library).toHaveBeenCalled()
        expect(connect_google_service._load_library).toHaveBeenCalled()
        expect(connect_google_service._get_access_token).toHaveBeenCalled()
        expect(connect_google_service._get_contacts).toHaveBeenCalled()
        done()

    it 'it requests an access token if none has been set', (done) ->
      window.gapi =
        auth:
          getToken: -> return false

      spyOn(connect_google_service, '_get_access_token').and.callThrough()
      spyOn(window.gapi.auth, 'getToken').and.callThrough()
      spyOn(connect_google_service, '_authenticate').and.returnValue Promise.resolve()

      connect_google_service.get_contacts()
      .then ->
        expect(connect_google_service._init_library).toHaveBeenCalled()
        expect(connect_google_service._load_library).not.toHaveBeenCalled()
        expect(connect_google_service._get_access_token).toHaveBeenCalled()
        expect(window.gapi.auth.getToken).toHaveBeenCalled()
        expect(connect_google_service._authenticate).toHaveBeenCalled()
        expect(connect_google_service._get_contacts).toHaveBeenCalled()
        done()

    it 'it uses an available access token to request contacts', (done) ->
      window.gapi =
        auth:
          getToken: -> return {access_token: access_token}

      spyOn(connect_google_service, '_get_access_token').and.callThrough()
      spyOn(window.gapi.auth, 'getToken').and.callThrough()
      spyOn connect_google_service, '_authenticate'

      connect_google_service.get_contacts()
      .then ->
        expect(connect_google_service._init_library).toHaveBeenCalled()
        expect(connect_google_service._load_library).not.toHaveBeenCalled()
        expect(connect_google_service._get_access_token).toHaveBeenCalled()
        expect(window.gapi.auth.getToken).toHaveBeenCalled()
        expect(connect_google_service._authenticate).not.toHaveBeenCalled()
        expect(connect_google_service._get_contacts).toHaveBeenCalled()
        done()
