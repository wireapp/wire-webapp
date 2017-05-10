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

// grunt test_init && grunt test_run:user/UserConnectionMapper

'use strict';

describe('z.user.UserConnectionMapper', function() {
  let mapper = undefined;

  beforeAll(function() {
    mapper = new z.user.UserConnectionMapper();
  });

  describe('map_user_connection_from_json', function() {
    it('escapes all properties of an object', function() {
      const payload = {
        'conversation': '4a559f61-8466-45a7-b366-9e1662f02370',
        'from': '109da9ca-a495-47a8-ac70-9ffbe924b2d0',
        'last_update': '2017-02-14T12:43:31.460Z',
        'message': '',
        'status': 'accepted',
        'to': '39b7f597-dfd1-4dff-86f5-fe1b79cb70a0',
      };

      const connection_et = mapper.map_user_connection_from_json(payload);

      expect(connection_et.conversation_id).toBe(payload.conversation);
      expect(connection_et.from).toBe(payload.from);
      expect(connection_et.last_update).toBe(payload.last_update);
      expect(connection_et.message).toBe(payload.message);
      expect(connection_et.status()).toBe(payload.status);
      expect(connection_et.to).toBe(payload.to);
    });
  });
});
