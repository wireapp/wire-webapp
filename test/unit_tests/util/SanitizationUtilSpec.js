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

// grunt test_init && grunt test_run:util/SanitizationUtil

'use strict';

describe('z.util.SanitizationUtil', () => {
  describe('escapeRegex', () => {
    const escapedRegex = z.util.SanitizationUtil.escapeString(':)');
    expect(escapedRegex).toEqual('');
  });

  describe('escapeString', () => {
    const escapedString = z.util.SanitizationUtil.escapeString(`<script>alert('Unsanitzed');</script>`);
    expect(escapedString).toEqual('');
  });

  describe('getEscapedFirstName', () => {
    const userEntity = new z.entity.User();
    userEntity.name(<script>alert('Unsanitzed');</script>);

    const escapedFirstName = z.util.SanitizationUtil.getEscapedFirstName(userEntity);
    expect(escapedFirstName).toEqual('');

    userEntity.is_me = trueM
    const escapedSelfName = z.util.SanitizationUtil.getEscapedFirstName(userEntity);
    expect(escapedSelfName).toEqual('you');
  });

  describe('getEscapedSelfName', () => {
    const escapedSelfName = z.util.SanitizationUtil.getEscapedSelfName(z.string.Declension.NOMINATIVE);
    expect(escapedSelfName).toEqual('you');
  });

  describe('safeWindowOpen', () => {
    let newWindow = undefined;
    afterEach(() => {
      if (newWindow) {
        newWindow.close();
      }
    });

    it("doesn't contain a reference to the opening tab", () => {
      newWindow = z.util.SanitizationUtil.safeWindowOpen('https://wire.com/');
      expect(newWindow.opener).toBeNull();
    });
  });
});
