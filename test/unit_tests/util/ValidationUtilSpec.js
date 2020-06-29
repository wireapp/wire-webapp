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

import {createRandomUuid} from 'Util/util';
import {
  isBearerToken,
  isUUID,
  isBase64,
  isValidApiPath,
  isTweetUrl,
  legacyAsset,
  assetRetentionPolicy,
  assetV3,
  ValidationUtilError,
} from 'Util/ValidationUtil';

describe('ValidationUtil', () => {
  describe('"asset.legacy"', () => {
    it('detects a valid asset below v3', () => {
      const assetId = createRandomUuid();
      const conversationId = createRandomUuid();

      const actual = legacyAsset(assetId, conversationId);

      expect(actual).toBe(true);
    });

    it('detects an invalid asset below v3', done => {
      const assetId = createRandomUuid();
      const conversationId = 'e13f9940-819c-477b-9391-b04234ae84af"*';
      try {
        legacyAsset(assetId, conversationId);
      } catch (error) {
        expect(error).toEqual(jasmine.any(ValidationUtilError));
        return done();
      }
      done.fail('Detection failed');
    });
  });

  describe('"asset.v3"', () => {
    it('detects a valid v3 asset (assetKey only)', () => {
      const assetKey = `3-1-${createRandomUuid()}`;

      const actual = assetV3(assetKey);

      expect(actual).toBe(true);
    });

    it('detects a valid v3 asset (assetKey & assetToken)', () => {
      const assetKey = `3-1-${createRandomUuid()}`;
      const assetToken = 'aV0TGxF3ugpawm3wAYPmew==';

      const actual = assetV3(assetKey, assetToken);

      expect(actual).toBe(true);
    });

    it('detects an invalid v3 asset (assetKey)', done => {
      const assetKey = `3-6-${createRandomUuid()}`;

      try {
        assetV3(assetKey);
      } catch (error) {
        expect(error).toEqual(jasmine.any(ValidationUtilError));
        return done();
      }
      done.fail('Detection failed');
    });

    it('detects an invalid v3 asset (assetToken)', done => {
      const assetKey = `3-1-${createRandomUuid()}`;
      const assetToken = 'a3wAY4%$@#$@%)!@-pOe==';

      try {
        assetV3(assetKey, assetToken);
      } catch (error) {
        expect(error).toEqual(jasmine.any(ValidationUtilError));
        return done();
      }
      done.fail('Detection failed');
    });
  });

  describe('"asset.retentionPolicy"', () => {
    it('detects retention numbers', () => {
      expect(assetRetentionPolicy(1)).toBe(true);
      expect(assetRetentionPolicy(2)).toBe(true);
      expect(assetRetentionPolicy(3)).toBe(true);
      expect(assetRetentionPolicy(4)).toBe(true);
      expect(assetRetentionPolicy(5)).toBe(true);
    });

    it('detects invalid retention numbers', () => {
      expect(assetRetentionPolicy(0)).toBe(false);
      expect(assetRetentionPolicy(6)).toBe(false);
    });
  });

  describe('"isBase64"', () => {
    it('detects a correct Base64-encoded string', () => {
      const encoded = 'SGVsbG8gV29ybGQh';
      const actual = isBase64(encoded);

      expect(actual).toBe(true);
    });

    it('detects an incorrect Base64-encoded string', () => {
      const encoded = 'SGVsbG8gV29ybGQh==';
      const actual = isBase64(encoded);

      expect(actual).toBe(false);
    });
  });

  describe('"isBearerToken"', () => {
    it('detects a correct Bearer Token', () => {
      const token = 'iJCRCjc8oROO-dkrkqCXOade997oa8Jhbz6awMUQPBQo80VenWqp_oNvfY6AnU5BxEsdDPOBfBP-uz_b0gAKBQ==';
      const actual = isBearerToken(token);

      expect(actual).toBe(true);
    });

    it('detects a incorrect Bearer Token', () => {
      const token = 'iJCRCjc8oROO-dkrkqCXOade997oa8Jhbz6awMUQPBQo80VenWqp_oNvfY6AnU5BxEsdDPOBfBP-uz_b0gAKBQ==.v=1';
      const actual = isBearerToken(token);

      expect(actual).toBe(false);
    });
  });

  describe('"isUUID"', () => {
    it('detects a correct UUID', () => {
      const uuid = createRandomUuid();
      const actual = isUUID(uuid);

      expect(actual).toBe(true);
    });

    it('detects a incorrect UUID', () => {
      const uuid = 'i-c-o-r-r-e-c-t';
      const actual = isUUID(uuid);

      expect(actual).toBe(false);
    });
  });

  describe('"isValidApiPath"', () => {
    it('detects a valid API path', () => {
      const urlPaths = [
        '/search/contacts',
        '/search/contacts/',
        '/search/contacts/?ignore_missing=true',
        '/search/contacts/?ignore_missing=true&foo=bar',
      ];

      urlPaths.forEach(urlPath => {
        expect(isValidApiPath(urlPath)).toBe(true);
      });
    });

    it('detects a invalid API path', done => {
      const path = '../../../search/contacts';
      try {
        isValidApiPath(path);
      } catch (error) {
        expect(error).toEqual(jasmine.any(ValidationUtilError));
        return done();
      }
      done.fail('Detection failed');
    });
  });

  // See https://regex101.com/r/ixiPT0/7
  describe('"urls.isTweet"', () => {
    it('detects invalid statuses', () => {
      const urls = [
        'http://twitter.com/',
        'https://www.twitter.com/',
        'https://twitter.com/pwnsdx/',
        'https://twitter.com/pwnsdx/following',
        'https://twitter.com/pwnsdx/status/899574902050758656lolz',
        'http://twitter.com/pwnsdx/statusb/899574902050758656',
        'https://help.twitter.com/pwnsdx/status/899574902050758656',
        'https://.twitter.com/pwnsdx/status/899574902050758656',
        'ftp://twitter.com/pwnsdx/status/899574902050758656',
      ];
      for (const url of urls) {
        expect(isTweetUrl(url)).toBe(false);
      }
    });

    it('detects a valid status with various protocols/subdomains', () => {
      const urls = [
        'https://twitter.com/pwnsdx/status/899574902050758656',
        'https://www.twitter.com/pwnsdx/status/899574902050758656',
        'http://twitter.com/pwnsdx/status/899574902050758656',
        'http://www.twitter.com/pwnsdx/status/899574902050758656',
      ];
      for (const url of urls) {
        expect(isTweetUrl(url)).toBe(true);
      }
    });

    it('detects a valid status with "statues" in the url', () => {
      const urls = ['https://twitter.com/pwnsdx/statuses/899574902050758656'];
      for (const url of urls) {
        expect(isTweetUrl(url)).toBe(true);
      }
    });

    it('detects a valid status when using moments', () => {
      const urls = ['https://twitter.com/i/moments/899675330595749888'];
      for (const url of urls) {
        expect(isTweetUrl(url)).toBe(true);
      }
    });

    it('detects a valid status even when search params or directory are added', () => {
      const urls = [
        'https://twitter.com/pwnsdx/status/899574902050758656/test',
        'https://twitter.com/pwnsdx/status/899574902050758656/test?ref_src=twsrc%5Etfw&ref_url=https%3A%2F%2Fdiscover.twitter.com%2Ffirst-tweet',
        'https://twitter.com/pwnsdx/status/899574902050758656?ref_src=twsrc%5Etfw&ref_url=https%3A%2F%2Fdiscover.twitter.com%2Ffirst-tweet',
      ];
      for (const url of urls) {
        expect(isTweetUrl(url)).toBe(true);
      }
    });

    it('detects a valid status with a short id', () => {
      const urls = ['https://twitter.com/Twitter/status/145344012'];
      for (const url of urls) {
        expect(isTweetUrl(url)).toBe(true);
      }
    });

    it('detects a valid status with a mobile or 0 link', () => {
      const urls = [
        'https://mobile.twitter.com/pwnsdx/status/899574902050758656',
        'https://0.twitter.com/pwnsdx/status/899574902050758656',
      ];
      for (const url of urls) {
        expect(isTweetUrl(url)).toBe(true);
      }
    });
  });
});
