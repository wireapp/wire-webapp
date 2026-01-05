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

import {search} from 'Repositories/search/FullTextSearch';

describe('FullTextSearch', () => {
  describe('search', () => {
    it('should return false if text is not found', () => {
      expect(search('aa', '')).toBe(false);
      expect(search('aa', undefined)).toBe(false);
      expect(search('aa', 'bb')).toBe(false);
      expect(search('aa bb', '     ')).toBe(false);
    });

    it('should handle special chars', () => {
      expect(search('youtube.com/watch?v=pQHX-Sj', 'youtube.com/watch?v=pQHX-Sj')).toBe(true);
    });

    it('general', () => {
      expect(search('aa bb', 'aa')).toBe(true);
      expect(search('aa cc', 'aa bb')).toBe(false);
    });

    it('special signs', () => {
      expect(search('aa aa aa', 'aa aa')).toBe(true);
      expect(search('aa.bb', 'bb')).toBe(true);
      expect(search('aa....bb', 'bb')).toBe(true);
      expect(search('aa.bb', 'aa')).toBe(true);
      expect(search('aa....bb', 'aa')).toBe(true);
      expect(search('aa-bb', 'aa-bb')).toBe(true);
      expect(search('aa-bb', 'aa')).toBe(true);
      expect(search('aa-bb', 'bb')).toBe(true);
      expect(search('aa/bb', 'aa')).toBe(true);
      expect(search('aa/bb', 'bb')).toBe(true);
      expect(search('aa:bb', 'aa')).toBe(true);
      expect(search('aa:bb', 'bb')).toBe(true);
    });

    it('special cases', () => {
      expect(search('aa 11:45 am bb', '11:45')).toBe(true);
      expect(search('https://www.link.com/something-to-read?q=12&second#reader', 'something to read')).toBe(true);

      expect(search('@peter', 'peter')).toBe(true);
      // expect(search('René', 'rene')).toBe(true)
      // expect(search('Håkon Bø', 'Ha')).toBe(true)
    });

    it('transliteration', () => {
      expect(search('bb бб bb', 'бб')).toBe(true);
      expect(search('bb бб bb', 'bb')).toBe(true);
      expect(search('苹果', '苹果')).toBe(true);
    });
  });
});
