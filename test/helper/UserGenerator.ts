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
