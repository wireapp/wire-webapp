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

// grunt test_init && grunt test_run:message/MessageHashing

'use strict';

describe('z.message.MessageHashing', () => {
  describe('_getTimestampArray', () => {
    it('correctly creates a timestamp bytes buffer.', () => {
      const expectedHexValue = '000000005bcdcc09';
      const timestamp = 1540213769;

      const messageEntity = new z.entity.Message(z.util.createRandomUuid());
      messageEntity.timestamp(timestamp);

      const bytesArray = z.message.MessageHashing._getTimestampArray(timestamp);
      const hexValue = z.util.StringUtil.bytesToHex(bytesArray);

      expect(hexValue).toBe(expectedHexValue);
    });
  });

  describe('getTextMessageHash', () => {
    it('correctly creates a markdown text bytes buffer.', () => {
      const expectedHexValue =
        'feff005400680069007300200068006100730020002a002a006d00610072006b0064006f0077006e002a002a000000005bcdcccd';
      const expectedHashValue = 'f25a925d55116800e66872d2a82d8292adf1d4177195703f976bc884d32b5c94';

      const text = 'This has **markdown**';
      const timestamp = 1540213965;

      const textEntity = new z.entity.Text(z.util.createRandomUuid(), text);

      const textArray = z.message.MessageHashing._getTextArray(textEntity);
      const timestampArray = z.message.MessageHashing._getTimestampArray(timestamp);
      const concatenatedArray = textArray.concat(timestampArray);
      const hexValue = z.util.StringUtil.bytesToHex(concatenatedArray);

      expect(hexValue).toBe(expectedHexValue);

      const messageEntity = new z.entity.ContentMessage(z.util.createRandomUuid());
      messageEntity.timestamp(timestamp);
      messageEntity.add_asset(textEntity);

      return z.message.MessageHashing.getTextMessageHash(messageEntity).then(hashArray => {
        const hashValue = z.util.StringUtil.bytesToHex(hashArray);

        expect(hashValue).toBe(expectedHashValue);
      });
    });

    it('correctly creates an arabic text bytes buffer.', () => {
      const expectedHexValue = 'feff0628063a062f0627062f000000005bcdcccd';
      const expectedHashValue = '5830012f6f14c031bf21aded5b07af6e2d02d01074f137d106d4645e4dc539ca';

      const text = 'بغداد';
      const timestamp = 1540213965;

      const textEntity = new z.entity.Text(z.util.createRandomUuid(), text);

      const textArray = z.message.MessageHashing._getTextArray(textEntity);
      const timestampArray = z.message.MessageHashing._getTimestampArray(timestamp);
      const concatenatedArray = textArray.concat(timestampArray);
      const hexValue = z.util.StringUtil.bytesToHex(concatenatedArray);

      expect(hexValue).toBe(expectedHexValue);

      const messageEntity = new z.entity.ContentMessage(z.util.createRandomUuid());
      messageEntity.timestamp(timestamp);
      messageEntity.add_asset(textEntity);

      return z.message.MessageHashing.getTextMessageHash(messageEntity).then(hashArray => {
        const hashValue = z.util.StringUtil.bytesToHex(hashArray);

        expect(hashValue).toBe(expectedHashValue);
      });
    });

    it('correctly creates an emoji text bytes buffer.', () => {
      const expectedHexValue =
        'feff00480065006c006c006f0020d83ddc69200dd83ddcbbd83ddc68200dd83ddc69200dd83ddc670021000000005bcdcc09';
      const expectedHashValue = '4f8ee55a8b71a7eb7447301d1bd0c8429971583b15a91594b45dee16f208afd5';

      const text = 'Hello 👩‍💻👨‍👩‍👧!';
      const timestamp = 1540213769;

      const textEntity = new z.entity.Text(z.util.createRandomUuid(), text);

      const textArray = z.message.MessageHashing._getTextArray(textEntity);
      const timestampArray = z.message.MessageHashing._getTimestampArray(timestamp);
      const concatenatedArray = textArray.concat(timestampArray);
      const hexValue = z.util.StringUtil.bytesToHex(concatenatedArray);

      expect(hexValue).toBe(expectedHexValue);

      const messageEntity = new z.entity.ContentMessage(z.util.createRandomUuid());
      messageEntity.timestamp(timestamp);
      messageEntity.add_asset(textEntity);

      return z.message.MessageHashing.getTextMessageHash(messageEntity).then(hashArray => {
        const hashValue = z.util.StringUtil.bytesToHex(hashArray);

        expect(hashValue).toBe(expectedHashValue);
      });
    });

    it('correctly creates a link text bytes buffer.', () => {
      const expectedHexValue =
        'feff00680074007400700073003a002f002f007700770077002e0079006f00750074007500620065002e0063006f006d002f00770061007400630068003f0076003d0044004c007a00780072007a004600430079004f0073000000005bcdcc09';
      const expectedHashValue = 'ef39934807203191c404ebb3acba0d33ec9dce669f9acec49710d520c365b657';

      const text = 'https://www.youtube.com/watch?v=DLzxrzFCyOs';
      const timestamp = 1540213769;

      const textEntity = new z.entity.Text(z.util.createRandomUuid(), text);

      const textArray = z.message.MessageHashing._getTextArray(textEntity);
      const timestampArray = z.message.MessageHashing._getTimestampArray(timestamp);
      const concatenatedArray = textArray.concat(timestampArray);
      const hexValue = z.util.StringUtil.bytesToHex(concatenatedArray);

      expect(hexValue).toBe(expectedHexValue);

      const messageEntity = new z.entity.ContentMessage(z.util.createRandomUuid());
      messageEntity.timestamp(timestamp);
      messageEntity.add_asset(textEntity);

      return z.message.MessageHashing.getTextMessageHash(messageEntity).then(hashArray => {
        const hashValue = z.util.StringUtil.bytesToHex(hashArray);

        expect(hashValue).toBe(expectedHashValue);
      });
    });
  });

  describe('getLocationMessageHash', () => {
    it('correctly creates a location bytes buffer.', () => {
      const expectedHexValue = '000000000000cd250000000000003458000000005bcdcc09';
      const expectedHashValue = '56a5fa30081bc16688574fdfbbe96c2eee004d1fb37dc714eec6efb340192816';

      const latitude = 52.5166667;
      const longitude = 13.4;
      const timestamp = 1540213769;

      const locationEntity = new z.entity.Location();
      locationEntity.latitude = latitude;
      locationEntity.longitude = longitude;

      const locationArray = z.message.MessageHashing._getLocationArray(locationEntity);
      const timestampArray = z.message.MessageHashing._getTimestampArray(timestamp);
      const concatenatedArray = locationArray.concat(timestampArray);
      const hexValue = z.util.StringUtil.bytesToHex(concatenatedArray);

      expect(hexValue).toBe(expectedHexValue);

      const messageEntity = new z.entity.ContentMessage(z.util.createRandomUuid());
      messageEntity.timestamp(timestamp);
      messageEntity.add_asset(locationEntity);

      return z.message.MessageHashing.getLocationMessageHash(messageEntity).then(hashArray => {
        const hashValue = z.util.StringUtil.bytesToHex(hashArray);

        expect(hashValue).toBe(expectedHashValue);
      });
    });

    it('correctly creates another location bytes buffer.', () => {
      const expectedHexValue = '000000000000c935ffffffffffffff8b000000005bcdcc09';
      const expectedHashValue = '803b2698104f58772dbd715ec6ee5853d835df98a4736742b2a676b2217c9499';

      const latitude = 51.509143;
      const longitude = -0.117277;
      const timestamp = 1540213769;

      const locationEntity = new z.entity.Location();
      locationEntity.latitude = latitude;
      locationEntity.longitude = longitude;

      const locationArray = z.message.MessageHashing._getLocationArray(locationEntity);
      const timestampArray = z.message.MessageHashing._getTimestampArray(timestamp);
      const concatenatedArray = locationArray.concat(timestampArray);
      const hexValue = z.util.StringUtil.bytesToHex(concatenatedArray);

      expect(hexValue).toBe(expectedHexValue);

      const messageEntity = new z.entity.ContentMessage(z.util.createRandomUuid());
      messageEntity.timestamp(timestamp);
      messageEntity.add_asset(locationEntity);

      return z.message.MessageHashing.getLocationMessageHash(messageEntity).then(hashArray => {
        const hashValue = z.util.StringUtil.bytesToHex(hashArray);

        expect(hashValue).toBe(expectedHashValue);
      });
    });
  });

  describe('getAssetMessageHash', () => {
    it('correctly creates an asset bytes buffer.', () => {
      const expectedHexValue = '38d4f5b961a34228870637e75043dbaa000000005bcdcc09';
      const expectedHashValue = '585764d2b2741454628e908c57bad9d482a1ea048dc3f11ba82a5e613653e65b';

      const assetId = '38d4f5b9-61a3-4228-8706-37e75043dbaa';
      const timestamp = 1540213769;

      const fileAsset = new z.entity.File(assetId);
      fileAsset.original_resource({identifier: assetId});

      const assetIdArray = z.message.MessageHashing._getAssetIdArray(fileAsset);
      const timestampArray = z.message.MessageHashing._getTimestampArray(timestamp);
      const concatenatedArray = assetIdArray.concat(timestampArray);
      const hexValue = z.util.StringUtil.bytesToHex(concatenatedArray);

      expect(hexValue).toBe(expectedHexValue);

      const messageEntity = new z.entity.ContentMessage(z.util.createRandomUuid());
      messageEntity.timestamp(timestamp);
      messageEntity.add_asset(fileAsset);

      return z.message.MessageHashing.getAssetMessageHash(messageEntity).then(hashArray => {
        const hashValue = z.util.StringUtil.bytesToHex(hashArray);

        expect(hashValue).toBe(expectedHashValue);
      });
    });

    it('correctly creates another asset bytes buffer.', () => {
      const expectedHexValue = '82a6273535f24d4a8190284327979ca7000000005bcdcccd';
      const expectedHashValue = '46f392cb88a8e4f69d1c755f2c6c4e8b8ca0cf2db11b3de6499404548ef29905';

      const assetId = '82a62735-35f2-4d4a-8190-284327979ca7';
      const timestamp = 1540213965;

      const fileAsset = new z.entity.File(assetId);
      fileAsset.original_resource({identifier: assetId});

      const assetIdArray = z.message.MessageHashing._getAssetIdArray(fileAsset);
      const timestampArray = z.message.MessageHashing._getTimestampArray(timestamp);
      const concatenatedArray = assetIdArray.concat(timestampArray);
      const hexValue = z.util.StringUtil.bytesToHex(concatenatedArray);

      expect(hexValue).toBe(expectedHexValue);

      const messageEntity = new z.entity.ContentMessage(z.util.createRandomUuid());
      messageEntity.timestamp(timestamp);
      messageEntity.add_asset(fileAsset);

      return z.message.MessageHashing.getAssetMessageHash(messageEntity).then(hashArray => {
        const hashValue = z.util.StringUtil.bytesToHex(hashArray);

        expect(hashValue).toBe(expectedHashValue);
      });
    });
  });
});
