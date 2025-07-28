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

import {UserAsset, UserAssetType} from '@wireapp/api-client/lib/user';

import {Availability} from '@wireapp/protocol-messaging';

import {User} from 'Repositories/entity/User';
import {ACCENT_ID} from 'src/script/Config';
import {serverTimeHandler} from 'src/script/time/serverTimeHandler';
import {entities, payload} from 'test/api/payloads';
import {createUuid} from 'Util/uuid';

import {UserMapper} from './UserMapper';

describe('User Mapper', () => {
  const mapper = new UserMapper(serverTimeHandler);

  let self_user_payload: any = null;

  beforeEach(() => {
    self_user_payload = JSON.parse(JSON.stringify(payload.self.get));
  });

  describe('mapUserFromJson', () => {
    it('can convert JSON into a single user entity', () => {
      const user_et = mapper.mapUserFromJson(self_user_payload, '');

      expect(user_et.email()).toBe('jd@wire.com');
      expect(user_et.name()).toBe('John Doe');
      expect(user_et.isMe).toBeFalsy();
      expect(user_et.accent_id()).toBe(ACCENT_ID.BLUE);
    });

    it.each([
      ['local.test', false],
      ['federated.test', true],
    ])('can detect if a user is a federated user (%s)', (domain, expected) => {
      const user = mapper.mapUserFromJson(
        {
          id: 'id',
          locale: '',
          name: 'user',
          qualified_id: {domain: domain, id: 'id'},
        },
        'local.test',
      );

      expect(user.isFederated).toBe(expected);
    });

    // @SF.Federation @SF.Separation @TSFI.UserInterface @S0.2
    it('Detects that user is not in the team if teamId is the same but domain is different', () => {
      const teamId = 'team1';

      const user = mapper.mapUserFromJson(
        {
          id: 'id',
          name: 'guest',
          qualified_id: {domain: 'otherdomain.test', id: 'id'},
          team: teamId,
        },
        'local.domain',
      );

      expect(user.isFederated).toBe(true);
    });

    it('can convert users with profile images marked as non public', () => {
      self_user_payload.picture[0].info.public = false;
      self_user_payload.picture[1].info.public = false;
      const user_et = mapper.mapUserFromJson(self_user_payload, '');

      expect(user_et.name()).toBe('John Doe');
    });

    it('will return default accent color if null/undefined', () => {
      self_user_payload.accent_id = null;
      const user_et = mapper.mapUserFromJson(self_user_payload, '');

      expect(user_et.name()).toBe('John Doe');
      expect(user_et.accent_id()).toBe(ACCENT_ID.BLUE);
    });

    it('will return default accent color if backend returns 0', () => {
      self_user_payload.accent_id = 0;
      const user_et = mapper.mapUserFromJson(self_user_payload, '');

      expect(user_et.name()).toBe('John Doe');
      expect(user_et.accent_id()).toBe(ACCENT_ID.BLUE);
    });
  });

  describe('mapSelfUserFromJson', () => {
    it('can convert JSON into a single user entity', () => {
      const user_et = mapper.mapSelfUserFromJson(self_user_payload);

      expect(user_et.email()).toBe('jd@wire.com');
      expect(user_et.name()).toBe('John Doe');
      expect(user_et.isMe).toBeTruthy();
      expect(user_et.locale).toBe('en');
      expect(user_et.accent_id()).toBe(ACCENT_ID.BLUE);
    });
  });

  describe('mapUsersFromJson', () => {
    it('can convert JSON into multiple user entities', () => {
      const user_ets = mapper.mapUsersFromJson(payload.users.get.many, '');

      expect(user_ets.length).toBe(2);
      expect(user_ets[0].email()).toBe('jd@wire.com');
      expect(user_ets[1].name()).toBe('Jane Roe');
    });

    it('returns an empty array if input was undefined', () => {
      const user_ets = mapper.mapUsersFromJson(undefined, '');

      expect(user_ets).toBeDefined();
      expect(user_ets.length).toBe(0);
    });

    it('returns an empty array if input was an empty array', () => {
      const user_ets = mapper.mapUsersFromJson([], '');

      expect(user_ets).toBeDefined();
      expect(user_ets.length).toBe(0);
    });
  });

  describe('updateUserFromObject', () => {
    it('can update the accent color', () => {
      const user_et = new User();
      user_et.id = entities.user.john_doe.id;
      const data = {accent_id: 1, id: entities.user.john_doe.id};
      const updated_user_et = mapper.updateUserFromObject(user_et, data, '');

      expect(updated_user_et.accent_id()).toBe(ACCENT_ID.BLUE);
    });

    it('can update the user name', () => {
      const user_et = new User();
      user_et.id = entities.user.john_doe.id;
      const data = {id: entities.user.john_doe.id, name: entities.user.jane_roe.name};
      const updated_user_et = mapper.updateUserFromObject(user_et, data, '');

      expect(updated_user_et.name()).toBe(entities.user.jane_roe.name);
    });

    it('can update the user handle', () => {
      const user_et = new User();
      user_et.id = entities.user.john_doe.id;
      const data = {handle: entities.user.jane_roe.handle, id: entities.user.john_doe.id};
      const updated_user_et = mapper.updateUserFromObject(user_et, data, '');

      expect(updated_user_et.username()).toBe(entities.user.jane_roe.handle);
    });

    it("converts user's expiration date to local timestamp", () => {
      const userEntity = new User();
      userEntity.id = entities.user.john_doe.id;
      const expirationDate = new Date('2018-10-16T09:16:41.294Z');
      const adjustedExpirationDate = new Date('2018-10-16T09:16:59.294Z');

      spyOn(mapper['serverTimeHandler'], 'toLocalTimestamp').and.returnValue(adjustedExpirationDate.getTime());
      spyOn(userEntity, 'setGuestExpiration').and.callFake(timestamp => {
        expect(timestamp).toEqual(adjustedExpirationDate.getTime());
      });

      const data = {expires_at: expirationDate.toISOString(), id: userEntity.id};
      mapper.updateUserFromObject(userEntity, data, '');

      expect(mapper['serverTimeHandler'].toLocalTimestamp).not.toHaveBeenCalledWith();
      mapper['serverTimeHandler'].timeOffset(10);

      expect(mapper['serverTimeHandler'].toLocalTimestamp).toHaveBeenCalledWith(expirationDate.getTime());
    });

    it('cannot update the user name of a wrong user', () => {
      const user_et = new User();
      user_et.id = entities.user.john_doe.id;
      const data = {id: entities.user.jane_roe.id, name: entities.user.jane_roe.name};
      const functionCall = () => mapper.updateUserFromObject(user_et, data, '');

      expect(functionCall).toThrow();
    });

    it.each([
      [Availability.Type.AVAILABLE, Availability.Type.NONE],
      [Availability.Type.NONE, Availability.Type.AVAILABLE],
    ])('updates the availability (from %s to %s)', (from, to) => {
      const user = new User();
      user.availability(from);
      mapper.updateUserFromObject(user, {availability: to}, '');
      expect(user.availability()).toBe(to);
    });

    it('can update user with v3 assets', () => {
      const user_et = new User();
      user_et.id = entities.user.john_doe.id;
      const data = {
        assets: [
          {key: createUuid(), size: UserAssetType.PREVIEW, type: 'image' as UserAsset['type']},
          {key: createUuid(), size: UserAssetType.COMPLETE, type: 'image' as UserAsset['type']},
        ],
        id: entities.user.john_doe.id,
        name: entities.user.jane_roe.name,
      };
      const updated_user_et = mapper.updateUserFromObject(user_et, data, '');

      expect(updated_user_et.previewPictureResource()).toBeDefined();
      expect(updated_user_et.mediumPictureResource()).toBeDefined();
    });
  });
});
