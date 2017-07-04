/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

// grunt test_init && grunt test_run:auth/AuthRepository

'use strict';

describe('z.auth.AuthRepository', function() {
  const test_factory = new TestFactory();

  beforeAll(function(done) {
    test_factory.exposeAuthActors().then(done).catch(done.fail);
  });

  describe('_schedule_token_refresh', function() {
    beforeEach(function() {
      spyOn(TestFactory.auth_repository, 'renew_access_token');
      jasmine.clock().install();
    });

    afterEach(function() {
      jasmine.clock().uninstall();
    });

    afterAll(function() {
      jasmine.clock().uninstall();
    });

    it('renews the access token immediately if expiring in the past', function() {
      const expiration_timestamp = Date.now() - 30000;
      TestFactory.auth_repository._schedule_token_refresh(expiration_timestamp);
      expect(TestFactory.auth_repository.renew_access_token).toHaveBeenCalled();
    });

    it('renews the access token immediately if expiring within the next minute', function() {
      const expiration_timestamp = Date.now() + 30000;
      TestFactory.auth_repository._schedule_token_refresh(expiration_timestamp);
      expect(TestFactory.auth_repository.renew_access_token).toHaveBeenCalled();
    });

    it('renews the access token at the scheduled time', function() {
      const expiration_timestamp = Date.now() + 60500;
      TestFactory.auth_repository._schedule_token_refresh(expiration_timestamp);
      expect(TestFactory.auth_repository.renew_access_token).not.toHaveBeenCalled();
      jasmine.clock().tick(1000);
      expect(TestFactory.auth_repository.renew_access_token).toHaveBeenCalled();
    });

    it('clears an existing timeout before scheduling an new refresh', function() {
      spyOn(window, 'clearTimeout').and.callThrough();
      const first_timestamp = Date.now() + 60500;
      const second_timestamp = Date.now() + 61000;

      TestFactory.auth_repository._schedule_token_refresh(first_timestamp);
      expect(TestFactory.auth_repository.renew_access_token).not.toHaveBeenCalled();
      jasmine.clock().tick(250);
      expect(TestFactory.auth_repository.renew_access_token).not.toHaveBeenCalled();
      TestFactory.auth_repository._schedule_token_refresh(second_timestamp);
      expect(TestFactory.auth_repository.renew_access_token).not.toHaveBeenCalled();
      expect(window.clearTimeout).toHaveBeenCalled();
      jasmine.clock().tick(1000);
      expect(TestFactory.auth_repository.renew_access_token).toHaveBeenCalled();
    });
  });
});
