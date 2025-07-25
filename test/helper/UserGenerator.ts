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

import {faker} from '@faker-js/faker';
import {QualifiedId, UserAssetType} from '@wireapp/api-client/lib/user';
import type {User as APIClientUser} from '@wireapp/api-client/lib/user';

import type {User} from 'Repositories/entity/User';
import {UserMapper} from 'Repositories/user/UserMapper';
import {createUuid} from 'Util/uuid';

import {serverTimeHandler} from '../../src/script/time/serverTimeHandler';

export function generateQualifiedId(): QualifiedId {
  return {
    id: createUuid(),
    domain: 'test.wire.link',
  };
}

export function generateAPIUser(
  id: QualifiedId = {id: createUuid(), domain: 'test.wire.link'},
  overwites?: Partial<APIClientUser>,
): APIClientUser {
  return {
    accent_id: Math.floor(Math.random() * 7 + 1),
    assets: [
      {
        key: `3-1-${createUuid()}`,
        size: UserAssetType.PREVIEW,
        type: 'image',
      },
      {
        key: `3-1-${createUuid()}`,
        size: UserAssetType.COMPLETE,
        type: 'image',
      },
    ],
    handle: faker.internet.userName(),
    id: id.id,
    // replace special chars to avoid escaping problems with querying the DOM
    name: faker.person.fullName().replace(/[^a-zA-Z ]/g, ''),
    qualified_id: id,
    ...overwites,
  };
}

export function generateUser(id?: QualifiedId, overwites?: Partial<APIClientUser>): User {
  const apiUser = generateAPIUser(id, overwites);
  return new UserMapper(serverTimeHandler).mapUserFromJson(apiUser, '');
}
