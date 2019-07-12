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

import * as faker from 'faker';
import {User} from '../../src/script/entity/User';
import {serverTimeHandler} from '../../src/script/time/serverTimeHandler';
import {UserMapper} from '../../src/script/user/UserMapper';

const UUID = require('pure-uuid');

export class UserGenerator {
  static getRandomUser(): User {
    const template: Object = {
      'handle': faker.internet.userName(),
      'locale': 'en',
      'accent_id': Math.floor((Math.random() * 7) + 1),
      'picture': [],
      'name': faker.name.findName(),
      'id': new UUID(4).format(),
      'assets': [
        {
          'size': 'preview',
          'key': `3-1-${new UUID(4).format()}`,
          'type': 'image',
        },
        {
          'size': 'complete',
          'key': `3-1-${new UUID(4).format()}`,
          'type': 'image',
        },
      ],
    };

    return new UserMapper(serverTimeHandler).mapUserFromJson(template);
  }
}
