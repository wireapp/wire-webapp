/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {generateConversationUrl} from './routeGenerator';

describe('generateConversationUrl', () => {
  it('generates an URL that contains the given conversation ID', () => {
    const conversationIds = [
      '16177651-5307-421a-acc6-69d4016195f7',
      '16bcd453-71a4-4ba2-86e7-3b849034d521',
      '7c8c23d4-6d1c-45c2-a3dc-64f574ca98e4',
      '947fe755-451e-4548-b35a-1c191d79f3b1',
      'c917f831-de53-4551-98f5-c9d4c068c2eb',
    ];

    conversationIds.forEach(conversationId => {
      const url = generateConversationUrl({id: conversationId, domain: ''});

      expect(url).toContain(conversationId);
      expect(url).toContain('/conversation');
    });
  });

  it('generates an URL that includes the filePath when provided', () => {
    const conversationId = '16177651-5307-421a-acc6-69d4016195f7';
    const filePath = 'some/file/path';

    const url = generateConversationUrl({id: conversationId, domain: '', filePath});

    expect(url).toContain(conversationId);
    expect(url).toContain('/conversation');
    expect(url).toContain(filePath);
  });

  it('generates an URL that includes both domain and filePath when provided', () => {
    const conversationId = '16177651-5307-421a-acc6-69d4016195f7';
    const domain = 'example.com';
    const filePath = 'some/file/path';

    const url = generateConversationUrl({id: conversationId, domain, filePath});

    expect(url).toContain(conversationId);
    expect(url).toContain('/conversation');
    expect(url).toContain(domain);
    expect(url).toContain(filePath);
  });
});
