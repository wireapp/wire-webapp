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

import {createRandomUuid} from 'Util/util';

import {ACCENT_ID} from 'src/script/config';
import {User} from 'src/script/entity/User';
import {UserMapper} from 'src/script/user/UserMapper';
import {serverTimeHandler} from 'src/script/time/serverTimeHandler';

describe('User Mapper', () => {
  const mapper = new UserMapper(serverTimeHandler);

  let self_user_payload = null;

  beforeEach(() => {
    self_user_payload = JSON.parse(JSON.stringify(payload.self.get));
  });

  describe('mapUserFromJson', () => {
    it('can convert JSON into a single user entity', () => {
      const userEt = mapper.mapUserFromJson(self_user_payload);

      expect(userEt.email()).toBe('jd@wire.com');
      expect(userEt.name()).toBe('John Doe');
      expect(userEt.phone()).toBe('+49177123456');
      expect(userEt.isMe).toBeFalsy();
      expect(userEt.accent_id()).toBe(ACCENT_ID.YELLOW);
    });

    it('returns undefined if input was undefined', () => {
      const user = mapper.mapUserFromJson(undefined);

      expect(user).toBeUndefined();
    });

    it('can convert users with profile images marked as non public', () => {
      self_user_payload.picture[0].info.public = false;
      self_user_payload.picture[1].info.public = false;
      const userEt = mapper.mapUserFromJson(self_user_payload);

      expect(userEt.name()).toBe('John Doe');
    });

    it('will return default accent color if null/undefined', () => {
      self_user_payload.accent_id = null;
      const userEt = mapper.mapUserFromJson(self_user_payload);

      expect(userEt.name()).toBe('John Doe');
      expect(userEt.accent_id()).toBe(ACCENT_ID.BLUE);
    });

    it('will return default accent color if backend returns 0', () => {
      self_user_payload.accent_id = 0;
      const userEt = mapper.mapUserFromJson(self_user_payload);

      expect(userEt.name()).toBe('John Doe');
      expect(userEt.joaatHash).toBe(526273169);
      expect(userEt.accent_id()).toBe(ACCENT_ID.BLUE);
    });
  });

  describe('mapSelfUserFromJson', () =>
    it('can convert JSON into a single user entity', () => {
      const userEt = mapper.mapSelfUserFromJson(self_user_payload);

      expect(userEt.email()).toBe('jd@wire.com');
      expect(userEt.name()).toBe('John Doe');
      expect(userEt.phone()).toBe('+49177123456');
      expect(userEt.isMe).toBeTruthy();
      expect(userEt.locale).toBe('en');
      expect(userEt.accent_id()).toBe(ACCENT_ID.YELLOW);
    }));

  describe('mapUsersFromJson', () => {
    it('can convert JSON into multiple user entities', () => {
      const userEts = mapper.mapUsersFromJson(payload.users.get.many);

      expect(userEts.length).toBe(2);
      expect(userEts[0].email()).toBe('jd@wire.com');
      expect(userEts[1].name()).toBe('Jane Roe');
    });

    it('returns an empty array if input was undefined', () => {
      const userEts = mapper.mapUsersFromJson(undefined);

      expect(userEts).toBeDefined();
      expect(userEts.length).toBe(0);
    });

    it('returns an empty array if input was an empty array', () => {
      const userEts = mapper.mapUsersFromJson([]);

      expect(userEts).toBeDefined();
      expect(userEts.length).toBe(0);
    });
  });

  describe('updateUserFromObject', () => {
    it('can update the accent color', () => {
      const userEt = new User();
      userEt.id = entities.user.john_doe.id;
      const data = {accent_id: 1, id: entities.user.john_doe.id};
      const updated_user_et = mapper.updateUserFromObject(userEt, data);

      expect(updated_user_et.accent_id()).toBe(ACCENT_ID.BLUE);
    });

    it('can update the user name', () => {
      const userEt = new User();
      userEt.id = entities.user.john_doe.id;
      const data = {id: entities.user.john_doe.id, name: entities.user.jane_roe.name};
      const updated_user_et = mapper.updateUserFromObject(userEt, data);

      expect(updated_user_et.name()).toBe(entities.user.jane_roe.name);
    });

    it('can update the user handle', () => {
      const userEt = new User();
      userEt.id = entities.user.john_doe.id;
      const data = {handle: entities.user.jane_roe.handle, id: entities.user.john_doe.id};
      const updated_user_et = mapper.updateUserFromObject(userEt, data);

      expect(updated_user_et.username()).toBe(entities.user.jane_roe.handle);
    });

    it("converts user's expiration date to local timestamp", () => {
      const userEntity = new User();
      userEntity.id = entities.user.john_doe.id;
      const expirationDate = new Date('2018-10-16T09:16:41.294Z');
      const adjustedExpirationDate = new Date('2018-10-16T09:16:59.294Z');

      spyOn(mapper.serverTimeHandler, 'toLocalTimestamp').and.returnValue(adjustedExpirationDate.getTime());
      spyOn(userEntity, 'setGuestExpiration').and.callFake(timestamp => {
        expect(timestamp).toEqual(adjustedExpirationDate.getTime());
      });

      const data = {expires_at: expirationDate.toISOString(), id: userEntity.id};
      mapper.updateUserFromObject(userEntity, data);

      expect(mapper.serverTimeHandler.toLocalTimestamp).not.toHaveBeenCalledWith();
      mapper.serverTimeHandler.timeOffset(10);

      expect(mapper.serverTimeHandler.toLocalTimestamp).toHaveBeenCalledWith(expirationDate.getTime());
    });

    it('cannot update the user name of a wrong user', () => {
      const userEt = new User();
      userEt.id = entities.user.john_doe.id;
      const data = {id: entities.user.jane_roe.id, name: entities.user.jane_roe.name};
      const functionCall = () => mapper.updateUserFromObject(userEt, data);

      expect(functionCall).toThrow();
    });

    it('can update user with v3 assets', () => {
      const userEt = new User();
      userEt.id = entities.user.john_doe.id;
      const data = {
        assets: [
          {key: createRandomUuid(), size: 'preview', type: 'image'},
          {key: createRandomUuid(), size: 'complete', type: 'image'},
        ],
        id: entities.user.john_doe.id,
        name: entities.user.jane_roe.name,
      };
      const updated_user_et = mapper.updateUserFromObject(userEt, data);

      expect(updated_user_et.previewPictureResource()).toBeDefined();
      expect(updated_user_et.mediumPictureResource()).toBeDefined();
    });
  });
});
