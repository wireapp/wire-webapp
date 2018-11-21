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

// grunt test_run:entity/message/MessageEntities

describe('Message Entities', () => {
  let message_et = null;

  describe('is_downloadable', () => {
    it('message with text asset should not be downloadable', () => {
      message_et = new z.entity.ContentMessage();
      message_et.assets.push(new z.entity.Text());

      expect(message_et.is_downloadable()).toBe(false);
    });

    it('message with image asset should be downloadable', () => {
      message_et = new z.entity.ContentMessage();
      message_et.assets.push(new z.entity.MediumImage());

      expect(message_et.is_downloadable()).toBe(true);
    });

    it('message with file asset should be downloadable', () => {
      message_et = new z.entity.ContentMessage();
      const fileAsset = new z.entity.File();
      fileAsset.status(z.assets.AssetTransferState.UPLOADED);
      message_et.assets.push(fileAsset);

      expect(message_et.is_downloadable()).toBe(true);
    });

    it('ephemeral message with image asset should be downloadable', () => {
      message_et = new z.entity.ContentMessage();
      message_et.assets.push(new z.entity.MediumImage());
      message_et.ephemeral_expires(12312123);

      expect(message_et.is_downloadable()).toBe(true);
    });

    it('expired ephemeral message with image asset should not be downloadable', () => {
      message_et = new z.entity.ContentMessage();
      message_et.assets.push(new z.entity.MediumImage());
      message_et.ephemeral_expires(true);

      expect(message_et.is_downloadable()).toBe(false);
    });
  });

  describe('ContentMessage', () => {
    beforeEach(() => {
      message_et = new z.entity.ContentMessage();
    });

    describe('no asset', () => {
      it('has_asset_medium_image return false', () => {
        expect(message_et.has_asset_image()).toBe(false);
      });

      it('has_asset_text return false', () => {
        expect(message_et.has_asset_text()).toBe(false);
      });
    });

    describe('medium asset', () => {
      beforeEach(() => {
        message_et.assets.push(new z.entity.MediumImage());
      });

      it('has_asset_medium_image return true', () => {
        expect(message_et.has_asset_image()).toBe(true);
      });

      it('has_asset_text return false', () => {
        expect(message_et.has_asset_text()).toBe(false);
      });
    });

    describe('text asset', () => {
      beforeEach(() => {
        message_et.assets.push(new z.entity.Text());
      });

      it('has_asset_medium_image return false', () => {
        expect(message_et.has_asset_image()).toBe(false);
      });

      it('has_asset_text return true', () => {
        expect(message_et.has_asset_text()).toBe(true);
      });

      it('isObfuscated returns false if it is ephemeral and still sending', () => {
        message_et.status(z.message.StatusType.SENDING);
        message_et.ephemeral_expires(12312123);

        expect(message_et.isObfuscated()).toBe(false);
      });
    });
  });
});
