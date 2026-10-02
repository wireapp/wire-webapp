/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {getAllowedSftOrigins, isAllowedSftUrl} from './sftUrl';

describe('isAllowedSftUrl', () => {
  const allowedSftOrigins = getAllowedSftOrigins({sft_servers: [{urls: ['https://sft.example.com']}]});

  it.each([
    'https://sft.example.com',
    'https://sft.example.com/sft/conversation-id',
    'https://sft.example.com/arbitrary/path?query=value#fragment',
    'https://SFT.EXAMPLE.COM:443/sft/conversation-id',
  ])('accepts a configured normalized HTTPS origin: %s', requestedUrl => {
    expect(isAllowedSftUrl(requestedUrl, allowedSftOrigins)).toBe(true);
  });

  it.each([
    'http://sft.example.com/sft/conversation-id',
    'https://evil.example.com/sft/conversation-id',
    'https://sft.example.com.evil.example/sft/conversation-id',
    'https://evil-sft.example.com/sft/conversation-id',
    'https://sft.example.com:8443/sft/conversation-id',
    'https://sft.example.com@evil.example/sft/conversation-id',
    'https://169.254.169.254/',
    'https://localhost/',
    'not-a-url',
    '/sft/conversation-id',
    '//sft.example.com/sft/conversation-id',
    'https://',
    'https://sft.example.com:invalid/',
    'file:///sft/conversation-id',
    '',
  ])('rejects an untrusted or malformed URL: %s', requestedUrl => {
    expect(isAllowedSftUrl(requestedUrl, allowedSftOrigins)).toBe(false);
  });

  it.each(['https://sft.example.com:8443', 'https://169.254.169.254', 'https://localhost'])(
    'accepts a port or internal address only when explicitly configured: %s',
    configuredUrl => {
      const explicitlyAllowedOrigins = getAllowedSftOrigins({sft_servers: [{urls: [configuredUrl]}]});

      expect(isAllowedSftUrl(`${configuredUrl}/sft/conversation-id`, explicitlyAllowedOrigins)).toBe(true);
    },
  );

  it('rejects the default port when only a different explicit port is configured', () => {
    const explicitlyAllowedOrigins = getAllowedSftOrigins({sft_servers: [{urls: ['https://sft.example.com:8443']}]});

    expect(isAllowedSftUrl('https://sft.example.com', explicitlyAllowedOrigins)).toBe(false);
  });

  it('rejects all requests with an empty allowlist', () => {
    expect(isAllowedSftUrl('https://sft.example.com', new Set())).toBe(false);
  });
});

describe('getAllowedSftOrigins', () => {
  it('includes both SFT lists regardless of the federation flag and preserves the input', () => {
    const callingConfig = {
      sft_servers: [{urls: ['https://initial.example.com/path']}],
      sft_servers_all: [{urls: ['https://joinable.example.com:8443'], username: 'username', credential: 'credential'}],
      is_federating: false,
    };
    const originalCallingConfig = structuredClone(callingConfig);
    const actualOrigins = getAllowedSftOrigins(callingConfig);
    const expectedOrigins = new Set(['https://initial.example.com', 'https://joinable.example.com:8443']);

    expect(actualOrigins).toEqual(expectedOrigins);
    expect(callingConfig).toEqual(originalCallingConfig);
    expect(isAllowedSftUrl('https://joinable.example.com:8443/sft/conversation-id', actualOrigins)).toBe(true);
  });

  it('deduplicates normalized origins deterministically across both lists', () => {
    const callingConfig = {
      sft_servers: [{urls: ['https://SFT.EXAMPLE.COM:443/path']}, {urls: ['https://sft.example.com/another']}],
      sft_servers_all: [{urls: ['https://sft.example.com']}],
    };
    const actualOrigins = [...getAllowedSftOrigins(callingConfig)];

    expect(actualOrigins).toEqual(['https://sft.example.com']);
    expect([...getAllowedSftOrigins(callingConfig)]).toEqual(actualOrigins);
  });

  it.each(['sft_servers', 'sft_servers_all'])('ignores malformed entries in %s', sftListName => {
    const actualOrigins = getAllowedSftOrigins({
      [sftListName]: [
        undefined,
        null,
        'https://evil.example.com',
        {},
        {urls: 'https://evil.example.com'},
        {urls: null},
        {urls: {}},
        {urls: [undefined, null, {}, 123, '', 'not-a-url', 'http://insecure.example.com', '//relative.example.com']},
        {urls: ['https://valid.example.com']},
      ],
    });

    expect(actualOrigins).toEqual(new Set(['https://valid.example.com']));
  });

  it.each(['sft_servers', 'sft_servers_all'])(
    'preserves valid servers and URLs beside malformed values in %s',
    sftListName => {
      const callingConfig = {
        [sftListName]: [
          {urls: ['https://first.example.com']},
          {urls: null},
          {
            urls: [
              'https://second.example.com:8443/path',
              undefined,
              null,
              {},
              123,
              'not-a-url',
              'http://insecure.example.com',
              'https://third.example.com',
            ],
          },
        ],
      };
      const originalCallingConfig = structuredClone(callingConfig);
      const actualOrigins = getAllowedSftOrigins(callingConfig);

      expect(actualOrigins).toEqual(
        new Set(['https://first.example.com', 'https://second.example.com:8443', 'https://third.example.com']),
      );
      expect(callingConfig).toEqual(originalCallingConfig);
    },
  );

  it.each([
    {sft_servers: [{urls: ['https://valid.example.com']}]},
    {sft_servers_all: [{urls: ['https://valid.example.com']}]},
    {sft_servers: [{urls: ['https://valid.example.com']}], sft_servers_all: 'invalid'},
    {sft_servers: 'invalid', sft_servers_all: [{urls: ['https://valid.example.com']}]},
  ])('preserves a valid list when the other is missing or malformed: %p', callingConfig => {
    expect(getAllowedSftOrigins(callingConfig)).toEqual(new Set(['https://valid.example.com']));
  });

  it('ignores credentials and unrelated calling fields when deriving trusted origins', () => {
    const callingConfig = {
      sft_servers_all: [{urls: ['https://valid.example.com'], username: 123, credential: null}],
      ice_servers: null,
      ttl: 'invalid',
      is_federating: 'invalid',
    };

    expect(getAllowedSftOrigins(callingConfig)).toEqual(new Set(['https://valid.example.com']));
  });

  it.each([
    undefined,
    null,
    false,
    123,
    {},
    [],
    'https://sft.example.com',
    {sft_servers: 'https://sft.example.com'},
    {sft_servers_all: {urls: ['https://sft.example.com']}},
  ])('fails closed for missing or malformed lists: %p', callingConfig => {
    expect(getAllowedSftOrigins(callingConfig)).toEqual(new Set());
  });
});
