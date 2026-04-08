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

import {faker} from '@faker-js/faker';
import {v4 as uuidv4} from 'uuid';

export function getUUID(): string {
  return uuidv4();
}

export function getUrlParameter(url: string, parameter: string): string | string[] | null {
  if (typeof window === 'undefined') {
    return require('url').parse(url, true).query[parameter];
  }
  return new URL(url).searchParams.get(parameter);
}

export function mockUserPayload(userId: string): Object {
  return {
    accent_id: 3,
    assets: [],
    id: userId,
    locale: 'en',
    name: faker.name.fullName(),
    picture: [
      {
        content_length: 263345,
        content_type: 'image/jpeg',
        data: null,
        id: getUUID(),
        info: {
          correlation_id: getUUID(),
          height: 960,
          nonce: getUUID(),
          original_height: 960,
          original_width: 1280,
          public: true,
          tag: 'medium',
          width: 1280,
        },
      },
    ],
  };
}
