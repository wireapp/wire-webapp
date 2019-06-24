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

/* eslint-disable no-magic-numbers */
const faker = require('faker');
const UUID = require('pure-uuid');

function getUUID() {
  return new UUID(4).format();
}

module.exports = {
  getUUID,
  getUrlParameter: (url, parameter) => {
    if (typeof window === 'undefined') {
      return require('url').parse(url, true).query[parameter];
    }
    return new URL(url).searchParams.get(parameter);
  },
  mockUserPayload: userId => {
    return {
      accent_id: 3,
      assets: [],
      id: userId,
      locale: 'en',
      name: faker.name.findName(),
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
  },
};
