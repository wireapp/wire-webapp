/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

describe('Message Entities', function() {
  let message_et = null;

  describe('is_downloadable', function() {
    it('message with asset text should not be downloadable', function() {
      message_et = new z.entity.ContentMessage();
      message_et.assets.push(new z.entity.Text());
      expect(message_et.is_downloadable()).toBeFalsy();
    });

    it('message with asset image should be downloadable', function() {
      message_et = new z.entity.ContentMessage();
      message_et.assets.push(new z.entity.MediumImage());
      expect(message_et.is_downloadable()).toBeTruthy();
    });

    it('message with asset file should be downloadable', function() {
      message_et = new z.entity.ContentMessage();
      message_et.assets.push(new z.entity.File());
      expect(message_et.is_downloadable()).toBeTruthy();
    });
  });

  describe('ContentMessage', function() {
    beforeEach(function() {
      message_et = new z.entity.ContentMessage();
    });

    describe('no asset', function() {
      it('has_asset_medium_image return false', function() {
        expect(message_et.has_asset_image()).toBeFalsy();
      });

      it('has_asset_text return false', function() {
        expect(message_et.has_asset_text()).toBeFalsy();
      });
    });

    describe('medium asset', function() {
      beforeEach(function() {
        message_et.assets.push(new z.entity.MediumImage());
      });

      it('has_asset_medium_image return true', function() {
        expect(message_et.has_asset_image()).toBeTruthy();
      });

      it('has_asset_text return false', function() {
        expect(message_et.has_asset_text()).toBeFalsy();
      });
    });

    describe('text asset', function() {
      beforeEach(function() {
        message_et.assets.push(new z.entity.Text());
      });

      it('has_asset_medium_image return false', function() {
        expect(message_et.has_asset_image()).toBeFalsy();
      });

      it('has_asset_text return true', function() {
        expect(message_et.has_asset_text()).toBeTruthy();
      });
    });
  });
});
