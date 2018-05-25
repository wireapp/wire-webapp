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
      const urlBase = 'https://wire.com/';
      const expected = urlBase;
      const actual = UrlUtil.pathWithParams(urlBase);
      expect(actual).toEqual(expected);
      done();
    });

    it('constructs path with queries from plain path', done => {
      const urlBase = 'https://wire.com/';
      const expected = `${urlBase}?q=1`;
      const actual = UrlUtil.pathWithParams(urlBase, 'q=1');
      expect(actual).toEqual(expected);
      done();
    });

    it('constructs path with queries from a path with queries', done => {
      const urlBase = 'https://wire.com/?q=1';
      const expected = `${urlBase}?b=2`;
      const actual = UrlUtil.pathWithParams(urlBase, 'b=2');
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
  });

  describe('"hasURLParameter"', () => {
    it('returns false if parameter does not exist', done => {
      const expected = false;
      const actual = UrlUtil.hasURLParameter('q');
      expect(actual).toEqual(expected);
      done();
    });
  });
});
