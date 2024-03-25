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

import {URLParameter} from 'src/script/auth/URLParameter';
import {
  forwardParameter,
  appendParameter,
  getParameter,
  getDomainName,
  cleanURL,
  getLinksFromHtml,
  prependProtocol,
} from 'Util/UrlUtil';

describe('UrlUtil', () => {
  describe('appendParameter', () => {
    it('append param with & when URL contains param', () => {
      expect(appendParameter('foo.com?bar=true', 'fum=true')).toBe('foo.com?bar=true&fum=true');
    });

    it('append param with ? when URL contains param', () => {
      expect(appendParameter('foo.com', 'fum=true')).toBe('foo.com?fum=true');
    });
  });

  describe('forwardParameter', () => {
    it('forwards existing URL parameter set to true', () => {
      const url = forwardParameter('foo.com', URLParameter.TRACKING, '?tracking=true');

      expect(url).toBe('foo.com?tracking=true');
    });

    it('forwards existing URL parameter set to false', () => {
      const url = forwardParameter('foo.com', URLParameter.TRACKING, '?tracking=false');

      expect(url).toBe('foo.com?tracking=false');
    });

    it('forwards existing URL parameter with string value', () => {
      const url = forwardParameter('foo.com', URLParameter.TRACKING, '?tracking=bar');

      expect(url).toBe('foo.com?tracking=bar');
    });

    it('ignored non-existing URL parameters', () => {
      const url = forwardParameter('foo.com', URLParameter.TRACKING, '?bot=bar');

      expect(url).toBe('foo.com');
    });
  });

  describe('cleanURL', () => {
    it('lowercases domains and respects others components case', () => {
      const baseUrl = 'wire.com';
      const tests = [
        {expected: baseUrl, url: 'HTTPS://WWW.WIRE.COM/'},
        {expected: baseUrl, url: 'https://www.wire.com/'},
        {expected: baseUrl, url: 'http://www.wire.com/'},
        {expected: baseUrl, url: 'https://www.wire.com'},
        {expected: baseUrl, url: 'http://www.wire.com'},
        {expected: baseUrl, url: 'https://wire.com/'},
        {expected: baseUrl, url: 'http://wire.com/'},
        {expected: baseUrl, url: 'https://wire.com'},
        {expected: baseUrl, url: 'http://wire.com'},
        {expected: baseUrl, url: 'www.wire.com/'},
        {expected: baseUrl, url: 'www.WIRE.com/'},
        {expected: baseUrl, url: 'www.wire.com'},
        {expected: baseUrl, url: 'wire.com/'},
        {expected: `${baseUrl}/join`, url: `${baseUrl}/join`},
        {expected: `${baseUrl}:8080/join`, url: `${baseUrl}:8080/join`},
        {expected: `${baseUrl}/join`, url: `${baseUrl}/join/`},
        {expected: `${baseUrl}/join?key=ZE4543fdRETg`, url: `${baseUrl}/join?key=ZE4543fdRETg`},
        {expected: `${baseUrl}/join?key=ZE4543fdRETg#lOgIn`, url: `${baseUrl}/join?key=ZE4543fdRETg#lOgIn`},
      ];

      tests.forEach(({url, expected}) => {
        const result = cleanURL(url);

        expect(result).toBe(expected);
      });
    });

    it('returns empty string if URL is not set', () => {
      expect(cleanURL()).toBe('');
    });
  });

  describe('getLinksFromHtml', () => {
    it('returns an array of links from a given HTML markup', () => {
      const html = '<a href="https://www.google.com" target="_blank" rel="nofollow">https://www.google.com</a>';
      const links = getLinksFromHtml(html);

      expect(links.length).toBe(1);
      const link = links[0];

      expect(link.href).toBe('https://www.google.com/');
      expect(link.pathname).toBe('/');
    });

    it('handles undefined and null values', () => {
      let links = getLinksFromHtml(undefined);

      expect(links.length).toBe(0);
      links = getLinksFromHtml(null);

      expect(links.length).toBe(0);
    });

    it('always returns an array', () => {
      const html = '🦅🌾';
      const links = getLinksFromHtml(html);

      expect(links.length).toBe(0);
    });

    it('returns an array of links from a given HTML markup with an anchor tag and plaintext', () => {
      const text =
        'Check this <a href="https://www.google.com" target="_blank" rel="nofollow">https://www.google.com</a>';
      const links = getLinksFromHtml(text);

      expect(links.length).toBe(1);
    });

    it('returns an array of links from a given HTML markup with multiple anchor tags and plaintext', () => {
      const text =
        'My favorite websites are <a href="https://wire.com/" target="_blank" rel="nofollow noopener noreferrer">https://wire.com/</a> and <a href="https://stackoverflow.com" target="_blank" rel="nofollow noopener noreferrer">https://stackoverflow.com</a>';
      const links = getLinksFromHtml(text);

      expect(links.length).toBe(2);
    });
  });

  describe('getParameter', () => {
    it('get param with no arguments', () => {
      expect(getParameter('foo')).toBe(null);
    });
  });

  describe('prependProtocol', () => {
    it('adds http if protocol is missing', () => {
      expect(prependProtocol('wire.com/')).toBe('http://wire.com/');
    });

    it('does not add a protocol if present', () => {
      expect(prependProtocol('http://wire.com/')).toBe('http://wire.com/');
      expect(prependProtocol('https://wire.com/')).toBe('https://wire.com/');
    });
  });

  describe('getDomainName', () => {
    it('returns the domain name from a simple domain', () => {
      expect(getDomainName('wire.com')).toBe('wire');
      expect(getDomainName('http://wire.com')).toBe('wire');
      expect(getDomainName('ftp://wire.com')).toBe('wire');
    });

    it('returns the domain name from a subdomain', () => {
      expect(getDomainName('wire.example.com')).toBe('wire');
      expect(getDomainName('http://wire.example.com')).toBe('wire');
    });

    it('removes all other parts of the URL', () => {
      expect(getDomainName('wire.example.com/search/?q=1')).toBe('wire');
      expect(getDomainName('http://wire.example.com/search/?q=1')).toBe('wire');
    });
  });
});
