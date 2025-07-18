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

import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {FileAsset} from 'Repositories/entity/message/FileAsset';
import {MediumImage} from 'Repositories/entity/message/MediumImage';
import {Text} from 'Repositories/entity/message/Text';
import {StatusType} from 'src/script/message/StatusType';

describe('Message Entities', () => {
  let message_et = null;

  describe('isDownloadable', () => {
    it('message with text asset should not be downloadable', () => {
      message_et = new ContentMessage();
      message_et.assets.push(new Text());

      expect(message_et.isDownloadable()).toBeFalsy();
    });

    it('message with image asset should be downloadable', () => {
      message_et = new ContentMessage();
      message_et.assets.push(new MediumImage());

      expect(message_et.isDownloadable()).toBeTruthy();
    });

    it('message with file asset should be downloadable', () => {
      message_et = new ContentMessage();
      message_et.assets.push(new FileAsset());

      expect(message_et.isDownloadable()).toBeTruthy();
    });

    it('ephemeral message with image asset should be downloadable', () => {
      message_et = new ContentMessage();
      message_et.assets.push(new MediumImage());
      message_et.ephemeral_expires(12312123);

      expect(message_et.isDownloadable()).toBeTruthy();
    });

    it('expired ephemeral message with image asset should not be downloadable', () => {
      message_et = new ContentMessage();
      message_et.assets.push(new MediumImage());
      message_et.ephemeral_expires(true);

      expect(message_et.isDownloadable()).toBeFalsy();
    });
  });

  describe('ContentMessage', () => {
    beforeEach(() => {
      message_et = new ContentMessage();
    });

    describe('no asset', () => {
      it('hasAssetImage return false', () => {
        expect(message_et.hasAssetImage()).toBeFalsy();
      });

      it('hasAssetText return false', () => {
        expect(message_et.hasAssetText()).toBeFalsy();
      });
    });

    describe('medium asset', () => {
      beforeEach(() => {
        message_et.assets.push(new MediumImage());
      });

      it('hasAssetImage return true', () => {
        expect(message_et.hasAssetImage()).toBeTruthy();
      });

      it('hasAssetText return false', () => {
        expect(message_et.hasAssetText()).toBeFalsy();
      });
    });

    describe('text asset', () => {
      beforeEach(() => {
        message_et.assets.push(new Text());
      });

      it('hasAssetImage return false', () => {
        expect(message_et.hasAssetImage()).toBeFalsy();
      });

      it('hasAssetText return true', () => {
        expect(message_et.hasAssetText()).toBeTruthy();
      });

      it('isObfuscated returns false if it is ephemeral and still sending', () => {
        message_et.status(StatusType.SENDING);
        message_et.ephemeral_expires(12312123);

        expect(message_et.isObfuscated()).toBeFalsy();
      });
    });
  });
});
