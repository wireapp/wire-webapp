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

// grunt test_init && grunt test_run:util/URLUtil

'use strict';

describe('z.util.URLUtil', () => {
  describe('get_links_from_html', () => {
    it('returns an array of links from a given HTML markup', () => {
      const html = '<a href="https://www.google.com" target="_blank" rel="nofollow">https://www.google.com</a>';
      const links = z.util.URLUtil.get_links_from_html(html);
      expect(links.length).toBe(1);
    });

    it('returns an array of links from a given HTML markup with an anchor tag and plaintext', () => {
      const text =
        'Check this <a href="https://www.google.com" target="_blank" rel="nofollow">https://www.google.com</a>';
      const links = z.util.URLUtil.get_links_from_html(text);
      expect(links.length).toBe(1);
    });

    it('returns an array of links from a given HTML markup with multiple anchor tags and plaintext', () => {
      const text =
        'My favorite websites are <a href="https://wire.com/" target="_blank" rel="nofollow noopener noreferrer">https://wire.com/</a> and <a href="https://stackoverflow.com" target="_blank" rel="nofollow noopener noreferrer">https://stackoverflow.com</a>';
      const links = z.util.URLUtil.get_links_from_html(text);
      expect(links.length).toBe(2);
    });
  });
});
