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

import * as UrlUtil from './UrlUtil';

describe('pathWithParams', () => {
  it('name', () => {
    expect(1).toBe(1);
  });
});

describe('UrlUtil', () => {
  describe('pathWithParams', () => {
    it('keeps URL if no additional params are given', () => {
      const path = '/resource/';
      const expected = path;
      const actual = UrlUtil.pathWithParams(path);
      expect(actual).toEqual(expected);
    });

    it('constructs path with queries from plain path', () => {
      const path = '/resource/';
      const expected = `${path}?q1=1`;
      const actual = UrlUtil.pathWithParams(path, {q1: 1});
      expect(actual).toEqual(expected);
    });

    it('constructs path with queries from a path with queries', () => {
      const path = '/resource/';
      const Q1 = 'q1=1';
      const Q2 = 'q2=2';
      const expected = `${path}?${Q1}&${Q2}`;
      const actual = UrlUtil.pathWithParams(path, {q2: 2}, undefined, `?${Q1}`);
      expect(actual).toEqual(expected);
    });

    it('filters non-whitelisted queries', () => {
      const Q1 = 'q1=1';
      const Q2 = 'q2=2';
      const path = `/resource/`;

      const actual = UrlUtil.pathWithParams(path, {q2: 2}, ['q2'], `?${Q1}`);

      const expected = `${path}?${Q2}`;
      expect(actual).toEqual(expected);
    });

    it('strips parameters not mentioned in the whitelist', () => {
      const url = 'https://app.wire.com/?clienttype=permanent&sso_auto_login=true&hl=fr';
      const [path, query = ''] = url.split('?');

      const actual = UrlUtil.pathWithParams(path, undefined, ['clienttype', 'sso_auto_login'], query);

      const expected = 'https://app.wire.com/?clienttype=permanent&sso_auto_login=true';
      expect(actual).toEqual(expected);
    });

    it('overwrites parameters', () => {
      const url = 'https://app.wire.com/?clienttype=permanent&sso_auto_login=true&hl=en';
      const [path, query = ''] = url.split('?');

      const actual = UrlUtil.pathWithParams(path, {hl: 'fr'}, undefined, query);

      const expected = 'https://app.wire.com/?clienttype=permanent&sso_auto_login=true&hl=fr';
      expect(actual).toEqual(expected);
    });
  });

  describe('getURLParameter', () => {
    it('returns empty string if parameter does not exist', () => {
      const expected = '';
      const actual = UrlUtil.getURLParameter('q');
      expect(actual).toEqual(expected);
    });

    it('returns parameter value if parameter exist', () => {
      const expected = '1';
      const actual = UrlUtil.getURLParameter('q', '?q=1');
      expect(actual).toEqual(expected);
    });
  });

  describe('getURLParameterFromHash', () => {
    it('returns empty string if parameter does not exist', () => {
      const expected = '';
      const actual = UrlUtil.getURLParameterFromHash('q');
      expect(actual).toEqual(expected);
    });

    it('returns parameter value if parameter exist', () => {
      const expected = '1';
      const actual = UrlUtil.getURLParameterFromHash('q', '#q=1');
      expect(actual).toEqual(expected);
    });
  });

  describe('getURLParameterFromAny', () => {
    it('returns empty string if parameter does not exist', () => {
      const expected = '';
      const actual = UrlUtil.getURLParameterFromAny('q');
      expect(actual).toEqual(expected);
    });

    it('returns parameter value if parameter exist', () => {
      const expected = '1';
      const actual = UrlUtil.getURLParameterFromAny('q', '#q=1');
      expect(actual).toEqual(expected);
    });

    it('returns parameter value if parameter exist in both possible sources', () => {
      const expected = '1';
      const actual = UrlUtil.getURLParameterFromAny('q', '#q=1&test=44', '?q=3');
      expect(actual).toEqual(expected);
    });

    it('returns parameter value if parameter exist in both possible sources', () => {
      const expected = '';
      const actual = UrlUtil.getURLParameterFromAny('q', '#q=', '?q=3');
      expect(actual).toEqual(expected);
    });

    it('returns parameter value if parameter exist only as query parameter', () => {
      const expected = '3';
      const actual = UrlUtil.getURLParameterFromAny('q', '', '?q=3');
      expect(actual).toEqual(expected);
    });
  });

  describe('hasURLParameter', () => {
    it('returns false if parameter does not exist', () => {
      const expected = false;
      const actual = UrlUtil.hasURLParameter('q');
      expect(actual).toEqual(expected);
    });

    it('returns true if parameter exist', () => {
      const expected = true;
      const actual = UrlUtil.hasURLParameter('q', '?q=1');
      expect(actual).toEqual(expected);
    });
  });
});
