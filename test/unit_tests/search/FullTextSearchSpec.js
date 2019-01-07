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

describe('z.search.FullTextSearch', () => {
  describe('search', () => {
    it('should return false if text is not found', () => {
      expect(z.search.FullTextSearch.search('aa', '')).toBeFalsy();
      expect(z.search.FullTextSearch.search('aa', undefined)).toBeFalsy();
      expect(z.search.FullTextSearch.search('aa', 'bb')).toBeFalsy();
      expect(z.search.FullTextSearch.search('aa bb', '     ')).toBeFalsy();
    });

    it('should handle special chars', () => {
      expect(z.search.FullTextSearch.search('youtube.com/watch?v=pQHX-Sj', 'youtube.com/watch?v=pQHX-Sj')).toBeTruthy();
    });

    it('general', () => {
      expect(z.search.FullTextSearch.search('aa bb', 'aa')).toBeTruthy();
      expect(z.search.FullTextSearch.search('aa cc', 'aa bb')).toBeFalsy();
    });

    it('special signs', () => {
      expect(z.search.FullTextSearch.search('aa aa aa', 'aa aa')).toBeTruthy();
      expect(z.search.FullTextSearch.search('aa.bb', 'bb')).toBeTruthy();
      expect(z.search.FullTextSearch.search('aa....bb', 'bb')).toBeTruthy();
      expect(z.search.FullTextSearch.search('aa.bb', 'aa')).toBeTruthy();
      expect(z.search.FullTextSearch.search('aa....bb', 'aa')).toBeTruthy();
      expect(z.search.FullTextSearch.search('aa-bb', 'aa-bb')).toBeTruthy();
      expect(z.search.FullTextSearch.search('aa-bb', 'aa')).toBeTruthy();
      expect(z.search.FullTextSearch.search('aa-bb', 'bb')).toBeTruthy();
      expect(z.search.FullTextSearch.search('aa/bb', 'aa')).toBeTruthy();
      expect(z.search.FullTextSearch.search('aa/bb', 'bb')).toBeTruthy();
      expect(z.search.FullTextSearch.search('aa:bb', 'aa')).toBeTruthy();
      expect(z.search.FullTextSearch.search('aa:bb', 'bb')).toBeTruthy();
    });

    it('special cases', () => {
      expect(z.search.FullTextSearch.search('aa 11:45 am bb', '11:45')).toBeTruthy();
      expect(
        z.search.FullTextSearch.search('https://www.link.com/something-to-read?q=12&second#reader', 'something to read')
      ).toBeTruthy();

      expect(z.search.FullTextSearch.search('@peter', 'peter')).toBeTruthy();
      // expect(z.search.FullTextSearch.search('René', 'rene')).toBeTruthy()
      // expect(z.search.FullTextSearch.search('Håkon Bø', 'Ha')).toBeTruthy()
    });

    it('transliteration', () => {
      expect(z.search.FullTextSearch.search('bb бб bb', 'бб')).toBeTruthy();
      expect(z.search.FullTextSearch.search('bb бб bb', 'bb')).toBeTruthy();
      expect(z.search.FullTextSearch.search('苹果', '苹果')).toBeTruthy();
    });
  });
});
