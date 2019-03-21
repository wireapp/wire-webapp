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

import {UrlUtil} from '@wireapp/commons';

describe('UrlUtil', () => {
  describe('"pathWithParams"', () => {
    it('keeps URL if no additional params are given', done => {
      const path = '/resource/';
      const expected = path;
      const actual = UrlUtil.pathWithParams(path);
      expect(actual).toEqual(expected);
      done();
    });

    it('constructs path with queries from plain path', done => {
      const path = '/resource/';
      const expected = `${path}?q1=1`;
      const actual = UrlUtil.pathWithParams(path, {q1: 1});
      expect(actual).toEqual(expected);
      done();
    });

    it('constructs path with queries from a path with queries', done => {
      const path = '/resource/';
      const Q1 = 'q1=1';
      const Q2 = 'q2=2';
      const expected = `${path}?${Q1}&${Q2}`;
      const actual = UrlUtil.pathWithParams(path, {q2: 2}, undefined, `?${Q1}`);
      expect(actual).toEqual(expected);
      done();
    });

    it('filters non-whitelisted queries', done => {
      const Q1 = 'q1=1';
      const Q2 = 'q2=2';
      const path = `/resource/`;

      const actual = UrlUtil.pathWithParams(path, {q2: 2}, ['q2'], `?${Q1}`);

      const expected = `${path}?${Q2}`;
      expect(actual).toEqual(expected);
      done();
    });
  });

  describe('"getURLParameter"', () => {
    it('returns empty string if parameter does not exist', done => {
      const expected = '';
      const actual = UrlUtil.getURLParameter('q');
      expect(actual).toEqual(expected);
      done();
    });

    it('returns parameter value if parameter exist', done => {
      const expected = '1';
      const actual = UrlUtil.getURLParameter('q', '?q=1');
      expect(actual).toEqual(expected);
      done();
    });
  });

  describe('"hasURLParameter"', () => {
    it('returns false if parameter does not exist', done => {
      const expected = false;
      const actual = UrlUtil.hasURLParameter('q');
      expect(actual).toEqual(expected);
      done();
    });

    it('returns true if parameter exist', done => {
      const expected = true;
      const actual = UrlUtil.hasURLParameter('q', '?q=1');
      expect(actual).toEqual(expected);
      done();
    });
  });
});
