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

// grunt test_init && grunt test_run:util/ValidationUtil

'use strict';

describe('z.util.ValidationUtil', () => {
  describe('"isBase64"', () => {
    it('detects a correct Base64-encoded string', () => {
      const encoded = 'SGVsbG8gV29ybGQh';
      const actual = z.util.ValidationUtil.isBase64(encoded);
      expect(actual).toBe(true);
    });

    it('detects an incorrect Base64-encoded string', () => {
      const encoded = 'Hello World!';
      const actual = z.util.ValidationUtil.isBase64(encoded);
      expect(actual).toBe(false);
    });
  });

  describe('"isBearerToken"', () => {
    it('detects a correct Bearer Token', () => {
      const token = 'iJCRCjc8oROO-dkrkqCXOade997oa8Jhbz6awMUQPBQo80VenWqp_oNvfY6AnU5BxEsdDPOBfBP-uz_b0gAKBQ==';
      const actual = z.util.ValidationUtil.isBearerToken(token);
      expect(actual).toBe(true);
    });

    it('detects a incorrect Bearer Token', () => {
      const token = 'iJCRCjc8oROO-dkrkqCXOade997oa8Jhbz6awMUQPBQo80VenWqp_oNvfY6AnU5BxEsdDPOBfBP-uz_b0gAKBQ==.v=1';
      const actual = z.util.ValidationUtil.isBearerToken(token);
      expect(actual).toBe(false);
    });
  });

  describe('"isUUID"', () => {
    it('detects a correct UUID', () => {
      const uuid = UUID.genV4().hexString;
      const actual = z.util.ValidationUtil.isUUID(uuid);
      expect(actual).toBe(true);
    });

    it('detects a incorrect UUID', () => {
      const uuid = 'incorrect';
      const actual = z.util.ValidationUtil.isUUID(uuid);
      expect(actual).toBe(false);
    });
  });
});
