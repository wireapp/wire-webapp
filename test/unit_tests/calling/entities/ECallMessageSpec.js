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

// grunt test_init && grunt test_run:calling/entities/ECallMessage

'use strict';

describe('z.calling.entities.ECallMessage', function() {
  describe('_create_session_id', function() {
    const e_call_message_et = new z.calling.entities.ECallMessage();

    it('always returns an alphanumeric string of length four', function() {
      _.range(100).map(function() {
        expect(e_call_message_et._create_session_id()).toMatch(/(\w|\d){4}/);
      });
    });
  });
});
