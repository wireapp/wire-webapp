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

'use strict';

// grunt test_init && grunt test_run:entity/message/MessageEntities

describe('Message Entities', () => {
  describe('generateNameString', () => {
    let message_et = null;

    beforeEach(() => {
      message_et = new z.entity.MemberMessage();
    });

    it('can return correct string for more than one user', () => {
      const user_a = new z.entity.User(z.util.createRandomUuid());
      user_a.name('John');
      message_et.userEntities.push(user_a);

      expect(message_et._generateNameString()).toBe('[bold]John[/bold]');
    });

    it('can return correct string for more than one user', () => {
      const user_a = new z.entity.User(z.util.createRandomUuid());
      user_a.name('John');
      const user_b = new z.entity.User(z.util.createRandomUuid());
      user_b.name('Jim');
      message_et.userEntities.push(user_a, user_b);

      expect(message_et._generateNameString()).toBe('[bold]Jim[/bold] and [bold]John[/bold]');
    });

    it('can return correct string for more than one user', () => {
      const user_a = new z.entity.User(z.util.createRandomUuid());
      user_a.name('John');
      const user_b = new z.entity.User(z.util.createRandomUuid());
      user_b.name('Jim');
      const user_c = new z.entity.User(z.util.createRandomUuid());
      user_c.name('Jill');
      message_et.userEntities.push(user_a, user_b, user_c);

      expect(message_et._generateNameString()).toBe('[bold]Jill[/bold], [bold]Jim[/bold], and [bold]John[/bold]');
    });

    it('can return correct string for more than one user without sender', () => {
      const user_sender = new z.entity.User(z.util.createRandomUuid());
      user_sender.name('Sender');
      message_et.user(user_sender);

      const user_a = new z.entity.User(z.util.createRandomUuid());
      user_a.name('John');
      const user_b = new z.entity.User(z.util.createRandomUuid());
      user_b.name('Jim');
      const user_c = new z.entity.User(z.util.createRandomUuid());
      user_c.name('Jill');
      message_et.userEntities.push(user_sender, user_a, user_b, user_c);

      expect(message_et._generateNameString()).toBe('[bold]Jill[/bold], [bold]Jim[/bold], and [bold]John[/bold]');
    });
  });

  describe('is_deletable', () => {
    let message_et = null;

    beforeEach(() => {
      message_et = new z.entity.ContentMessage();
    });

    it('should return true when message is not a file', () => {
      message_et.assets.push(new z.entity.Text());

      expect(message_et.is_deletable()).toBeTruthy();
    });

    it('should return false when message is a file and uploading or downloading', () => {
      const file_et = new z.entity.File();
      message_et.assets.push(file_et);

      file_et.status(z.assets.AssetTransferState.DOWNLOADING);

      expect(message_et.is_deletable()).toBeFalsy();

      file_et.status(z.assets.AssetTransferState.UPLOADING);

      expect(message_et.is_deletable()).toBeFalsy();
    });

    it('should return false when message is a file and uploading or downloading', () => {
      const file_et = new z.entity.File();
      file_et.status(z.assets.AssetTransferState.UPLOADED);
      message_et.assets.push(file_et);

      expect(message_et.is_deletable()).toBeTruthy();
    });
  });

  describe('has_asset_file', () => {
    let message_et = null;

    beforeEach(() => {
      message_et = new z.entity.ContentMessage();
    });

    it('should return false by default', () => {
      expect(message_et.has_asset_file()).toBeFalsy();
    });

    it('should return false for Text asset', () => {
      message_et.assets.push(new z.entity.Text());

      expect(message_et.has_asset_file()).toBeFalsy();
    });

    it('should return true for File asset', () => {
      message_et.assets.push(new z.entity.File());

      expect(message_et.has_asset_file()).toBeTruthy();
    });
  });
});
