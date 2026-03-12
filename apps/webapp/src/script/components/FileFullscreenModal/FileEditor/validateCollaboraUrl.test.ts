/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {Maybe} from 'true-myth';
import {unwrap, unwrapErr} from 'true-myth/test-support';

import {validateCollaboraUrl} from './validateCollaboraUrl';

const TRUSTED_ORIGIN = 'https://cells.example.com';

describe('validateCollaboraUrl', () => {
  describe('url is empty', () => {
    it('returns empty error when url is undefined', () => {
      const result = validateCollaboraUrl(Maybe.of(undefined), TRUSTED_ORIGIN);
      expect(unwrapErr(result)).toEqual({reason: 'empty'});
    });

    it('returns empty error when url is an empty string', () => {
      const result = validateCollaboraUrl(Maybe.of(''), TRUSTED_ORIGIN);
      expect(unwrapErr(result)).toEqual({reason: 'empty'});
    });
  });

  describe('url is not HTTPS', () => {
    it('returns insecure error for http url', () => {
      const url = 'http://cells.example.com/editor';
      const result = validateCollaboraUrl(Maybe.of(url), TRUSTED_ORIGIN);
      expect(unwrapErr(result)).toEqual({reason: 'insecure', url});
    });

    it('returns insecure error for protocol-relative url', () => {
      const url = '//cells.example.com/editor';
      const result = validateCollaboraUrl(Maybe.of(url), TRUSTED_ORIGIN);
      expect(unwrapErr(result)).toEqual({reason: 'insecure', url});
    });

    it('returns insecure error for malformed https url', () => {
      const url = 'https://[cells.example.com/editor';
      const result = validateCollaboraUrl(Maybe.of(url), TRUSTED_ORIGIN);
      expect(unwrapErr(result)).toEqual({reason: 'insecure', url});
    });
  });

  describe('url origin does not match trusted origin', () => {
    it('returns untrusted error when origins differ', () => {
      const url = 'https://other.example.com/editor';
      const result = validateCollaboraUrl(Maybe.of(url), TRUSTED_ORIGIN);
      expect(unwrapErr(result)).toEqual({reason: 'untrusted', url, trustedOrigin: TRUSTED_ORIGIN});
    });

    it('returns untrusted error when subdomain differs', () => {
      const url = 'https://evil.cells.example.com/editor';
      const result = validateCollaboraUrl(Maybe.of(url), TRUSTED_ORIGIN);
      expect(unwrapErr(result)).toEqual({reason: 'untrusted', url, trustedOrigin: TRUSTED_ORIGIN});
    });
  });

  describe('url is valid', () => {
    it('returns ok for a matching HTTPS url', () => {
      const url = 'https://cells.example.com/editor?token=abc';
      const result = validateCollaboraUrl(Maybe.of(url), TRUSTED_ORIGIN);
      expect(unwrap(result)).toBe(url);
    });

    it('skips origin check when trustedOrigin is empty (Cells not configured)', () => {
      const url = 'https://cells.example.com/editor';
      const result = validateCollaboraUrl(Maybe.of(url), '');
      expect(unwrap(result)).toBe(url);
    });

    it('skips origin check when trustedOrigin is not a valid HTTPS url', () => {
      const url = 'https://cells.example.com/editor';
      const result = validateCollaboraUrl(Maybe.of(url), 'not-a-url');
      expect(unwrap(result)).toBe(url);
    });
  });
});
