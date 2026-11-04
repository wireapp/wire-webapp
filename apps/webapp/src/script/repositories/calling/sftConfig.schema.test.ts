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

import {sftConfigurationListsSchema, sftServerUrlsSchema} from './sftConfig.schema';

describe('SFT configuration schemas', () => {
  it('accepts missing server lists and falls back for invalid list values', () => {
    expect(sftConfigurationListsSchema.safeParse({}).success).toBe(true);
    expect(sftConfigurationListsSchema.parse({sft_servers: null, sft_servers_all: 'invalid'})).toEqual({
      sft_servers: [],
      sft_servers_all: [],
    });
  });

  it('accepts arbitrary values in server URL lists', () => {
    const serverUrls = [null, 'https://sft.example.com', {url: 'unvalidated'}];
    const actualConfiguration = sftServerUrlsSchema.parse({urls: serverUrls});

    expect(actualConfiguration.urls).toStrictEqual(serverUrls);
  });
});
