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

import {MediumImage} from 'src/script/entity/message/MediumImage';
import {StatusType} from 'src/script/message/StatusType';
import {FileAsset} from 'src/script/entity/message/FileAsset';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {Text} from 'src/script/entity/message/Text';

describe('Message Entities', () => {
  let message_et = null;

  describe('is_downloadable', () => {
    it('message with text asset should not be downloadable', () => {
      message_et = new ContentMessage();
      message_et.assets.push(new Text());

      expect(message_et.is_downloadable()).toBeFalsy();
    });

    it('message with image asset should be downloadable', () => {
      message_et = new ContentMessage();
      message_et.assets.push(new MediumImage());

      expect(message_et.is_downloadable()).toBeTruthy();
    });

    it('message with file asset should be downloadable', () => {
      message_et = new ContentMessage();
      message_et.assets.push(new FileAsset());

      expect(message_et.is_downloadable()).toBeTruthy();
    });

    it('ephemeral message with image asset should be downloadable', () => {
      message_et = new ContentMessage();
      message_et.assets.push(new MediumImage());
      message_et.ephemeral_expires(12312123);

      expect(message_et.is_downloadable()).toBeTruthy();
    });

    it('expired ephemeral message with image asset should not be downloadable', () => {
      message_et = new ContentMessage();
      message_et.assets.push(new MediumImage());
      message_et.ephemeral_expires(true);

      expect(message_et.is_downloadable()).toBeFalsy();
    });
  });

  describe('ContentMessage', () => {
    beforeEach(() => {
      message_et = new ContentMessage();
    });

    describe('no asset', () => {
      it('has_asset_medium_image return false', () => {
        expect(message_et.has_asset_image()).toBeFalsy();
      });

      it('has_asset_text return false', () => {
        expect(message_et.has_asset_text()).toBeFalsy();
      });
    });

    describe('medium asset', () => {
      beforeEach(() => {
        message_et.assets.push(new MediumImage());
      });

      it('has_asset_medium_image return true', () => {
        expect(message_et.has_asset_image()).toBeTruthy();
      });

      it('has_asset_text return false', () => {
        expect(message_et.has_asset_text()).toBeFalsy();
      });
    });

    describe('text asset', () => {
      beforeEach(() => {
        message_et.assets.push(new Text());
      });

      it('has_asset_medium_image return false', () => {
        expect(message_et.has_asset_image()).toBeFalsy();
      });

      it('has_asset_text return true', () => {
        expect(message_et.has_asset_text()).toBeTruthy();
      });

      it('isObfuscated returns false if it is ephemeral and still sending', () => {
        message_et.status(StatusType.SENDING);
        message_et.ephemeral_expires(12312123);

        expect(message_et.isObfuscated()).toBeFalsy();
      });
    });
  });
});
