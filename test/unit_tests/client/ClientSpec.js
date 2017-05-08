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

// grunt test_init && grunt test_run:client/Client

'use strict';

describe('z.client.Client', function() {
  describe('dismantle_user_client_id', function() {
    it('can get the user ID and client ID from a session ID', function() {
      const session_id = '034060fe-8406-476e-b29d-f0a214c0345b@4b0a0fbf418d264c';
      const ids = z.client.Client.dismantle_user_client_id(session_id);
      expect(ids.client_id).toBe('4b0a0fbf418d264c');
      expect(ids.user_id).toBe('034060fe-8406-476e-b29d-f0a214c0345b');
    });

    it('can handle an undefined input', function() {
      const ids = z.client.Client.dismantle_user_client_id(undefined);
      expect(ids.client_id).toBe(undefined);
      expect(ids.user_id).toBe(undefined);
    });
  });
});
