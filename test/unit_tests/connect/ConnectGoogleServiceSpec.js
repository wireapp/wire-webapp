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

// grunt test_run:connect/ConnectGoogleService

'use strict';

describe('z.connect.ConnectGoogleService', () => {
  const test_factory = new TestFactory();

  beforeAll(() => test_factory.exposeConnectActors());

  describe('getContacts', () => {
    const access_token = 'access_token';

    beforeEach(() => {
      spyOn(TestFactory.connectGoogleService, '_initLibrary').and.callThrough();
      spyOn(TestFactory.connectGoogleService, '_loadLibrary').and.returnValue(Promise.resolve());
      spyOn(TestFactory.connectGoogleService, '_getContacts').and.returnValue(Promise.resolve());
    });

    it('initializes the authentication library if previously was not', () => {
      spyOn(TestFactory.connectGoogleService, '_getAccessToken').and.returnValue(Promise.resolve());

      return TestFactory.connectGoogleService.getContacts().then(() => {
        expect(TestFactory.connectGoogleService._initLibrary).toHaveBeenCalled();
        expect(TestFactory.connectGoogleService._loadLibrary).toHaveBeenCalled();
        expect(TestFactory.connectGoogleService._getAccessToken).toHaveBeenCalled();
        expect(TestFactory.connectGoogleService._getContacts).toHaveBeenCalled();
      });
    });

    it('it requests an access token if none has been set', () => {
      window.gapi = {
        auth: {
          getToken() {
            return false;
          },
        },
      };

      spyOn(TestFactory.connectGoogleService, '_getAccessToken').and.callThrough();
      spyOn(window.gapi.auth, 'getToken').and.callThrough();
      spyOn(TestFactory.connectGoogleService, '_authenticate').and.returnValue(Promise.resolve());

      return TestFactory.connectGoogleService.getContacts().then(() => {
        expect(TestFactory.connectGoogleService._initLibrary).toHaveBeenCalled();
        expect(TestFactory.connectGoogleService._loadLibrary).not.toHaveBeenCalled();
        expect(TestFactory.connectGoogleService._getAccessToken).toHaveBeenCalled();
        expect(window.gapi.auth.getToken).toHaveBeenCalled();
        expect(TestFactory.connectGoogleService._authenticate).toHaveBeenCalled();
        expect(TestFactory.connectGoogleService._getContacts).toHaveBeenCalled();
      });
    });

    it('it uses an available access token to request contacts', () => {
      window.gapi = {
        auth: {
          getToken() {
            return {access_token};
          },
        },
      };

      spyOn(TestFactory.connectGoogleService, '_getAccessToken').and.callThrough();
      spyOn(window.gapi.auth, 'getToken').and.callThrough();
      spyOn(TestFactory.connectGoogleService, '_authenticate');

      return TestFactory.connectGoogleService.getContacts().then(() => {
        expect(TestFactory.connectGoogleService._initLibrary).toHaveBeenCalled();
        expect(TestFactory.connectGoogleService._loadLibrary).not.toHaveBeenCalled();
        expect(TestFactory.connectGoogleService._getAccessToken).toHaveBeenCalled();
        expect(window.gapi.auth.getToken).toHaveBeenCalled();
        expect(TestFactory.connectGoogleService._authenticate).not.toHaveBeenCalled();
        expect(TestFactory.connectGoogleService._getContacts).toHaveBeenCalled();
      });
    });
  });
});
