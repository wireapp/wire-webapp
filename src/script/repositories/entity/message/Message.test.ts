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

import {AssetType} from 'Repositories/assets/AssetType';

import {ContentMessage} from './ContentMessage';
import {FileAsset} from './FileAsset';
import {Message} from './Message';
import {Multipart} from './Multipart';
import {Text} from './Text';

import {SuperType} from '../../../message/SuperType';

describe('Message', () => {
  describe('getMultipartAssets', () => {
    it('returns multipart assets from a content message', () => {
      const message = new ContentMessage();
      const multipartAsset = new Multipart({text: 'Hello world'});
      const textAsset = new Text();

      message.assets.push(multipartAsset);
      message.assets.push(textAsset);

      const result = message.getMultipartAssets();

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(multipartAsset);
      expect(result[0].type).toBe(AssetType.MULTIPART);
    });

    it('returns multiple multipart assets when present', () => {
      const message = new ContentMessage();
      const multipartAsset1 = new Multipart({text: 'First multipart'});
      const multipartAsset2 = new Multipart({text: 'Second multipart'});
      const textAsset = new Text();

      message.assets.push(multipartAsset1);
      message.assets.push(textAsset);
      message.assets.push(multipartAsset2);

      const result = message.getMultipartAssets();

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(multipartAsset1);
      expect(result[1]).toBe(multipartAsset2);
    });

    it('returns empty array when message has no multipart assets', () => {
      const message = new ContentMessage();
      const textAsset = new Text();
      const fileAsset = new FileAsset();

      message.assets.push(textAsset);
      message.assets.push(fileAsset);

      const result = message.getMultipartAssets();

      expect(result).toEqual([]);
    });

    it('returns empty array when message has empty assets array', () => {
      const message = new ContentMessage();

      const result = message.getMultipartAssets();

      expect(result).toEqual([]);
    });

    it('returns empty array for non-content messages', () => {
      const message = new Message();

      const result = message.getMultipartAssets();

      expect(result).toEqual([]);
    });

    it('handles messages with only multipart assets', () => {
      const message = new ContentMessage();
      const multipartAsset1 = new Multipart({text: 'First'});
      const multipartAsset2 = new Multipart({text: 'Second'});
      const multipartAsset3 = new Multipart({text: 'Third'});

      message.assets.push(multipartAsset1);
      message.assets.push(multipartAsset2);
      message.assets.push(multipartAsset3);

      const result = message.getMultipartAssets();

      expect(result).toHaveLength(3);
      expect(result.every(asset => asset.isMultipart())).toBe(true);
    });

    it('filters out assets that are not multipart', () => {
      const message = new ContentMessage();
      const multipartAsset = new Multipart({text: 'Multipart content'});
      const textAsset = new Text();
      const fileAsset = new FileAsset();

      message.assets.push(textAsset);
      message.assets.push(multipartAsset);
      message.assets.push(fileAsset);

      const result = message.getMultipartAssets();

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(multipartAsset);
      expect(result.some(asset => asset.isText())).toBe(false);
      expect(result.some(asset => asset.isFile())).toBe(false);
    });

    it('returns empty array when hasMultipartAsset returns false', () => {
      const message = new ContentMessage();
      const textAsset = new Text();

      message.assets.push(textAsset);

      // Verify hasMultipartAsset would return false
      expect(message.hasMultipartAsset()).toBe(false);

      const result = message.getMultipartAssets();

      expect(result).toEqual([]);
    });

    it('returns multipart assets when hasMultipartAsset returns true', () => {
      const message = new ContentMessage();
      const multipartAsset = new Multipart({text: 'Content'});

      message.assets.push(multipartAsset);

      // Verify hasMultipartAsset returns true
      expect(message.hasMultipartAsset()).toBe(true);

      const result = message.getMultipartAssets();

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(multipartAsset);
    });

    it('returns empty array when message super_type is not CONTENT', () => {
      const message = new Message();
      // Manually set super_type to something other than CONTENT
      message.super_type = SuperType.CALL;

      const result = message.getMultipartAssets();

      expect(result).toEqual([]);
    });

    it('handles multipart assets with attachments', () => {
      const message = new ContentMessage();
      // Create multipart with valid attachments structure
      const multipartWithAttachments = new Multipart({
        text: 'Message with attachments',
        attachments: [
          {
            cellAsset: {
              uuid: 'test-uuid',
              initialName: 'test.pdf',
              initialSize: 1024,
              contentType: 'application/pdf',
            },
          },
        ],
      });

      message.assets.push(multipartWithAttachments);

      const result = message.getMultipartAssets();

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(multipartWithAttachments);
      expect(result[0].attachments).toBeDefined();
    });

    it('handles multipart assets without attachments', () => {
      const message = new ContentMessage();
      const multipartNoAttachments = new Multipart({
        text: 'Message without attachments',
        attachments: null,
      });

      message.assets.push(multipartNoAttachments);

      const result = message.getMultipartAssets();

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(multipartNoAttachments);
      expect(result[0].attachments).toBeUndefined();
    });
  });

  describe('hasMultipartAsset', () => {
    it('returns true when content message has multipart asset', () => {
      const message = new ContentMessage();
      const multipartAsset = new Multipart({text: 'Test'});

      message.assets.push(multipartAsset);

      expect(message.hasMultipartAsset()).toBe(true);
    });

    it('returns false when content message has no multipart asset', () => {
      const message = new ContentMessage();
      const textAsset = new Text();

      message.assets.push(textAsset);

      expect(message.hasMultipartAsset()).toBe(false);
    });

    it('returns false for non-content messages', () => {
      const message = new Message();

      expect(message.hasMultipartAsset()).toBe(false);
    });

    it('returns false when assets array is empty', () => {
      const message = new ContentMessage();

      expect(message.hasMultipartAsset()).toBe(false);
    });
  });
});
