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

import {AvailableMessageContent, MessageHashService} from './MessageHashService';

describe('MessageHashService', () => {
  describe('"getHash"', () => {
    it('correctly identifies the message type.', () => {
      const content = {
        text: 'Hello!',
      };

      const messageHashService = new MessageHashService(content);

      jest.spyOn(messageHashService as any, 'getTextBytes');
      jest.spyOn(messageHashService as any, 'getLocationBytes');

      messageHashService.getHash();

      expect(messageHashService['getTextBytes']).toHaveBeenCalled();
      expect(messageHashService['getLocationBytes']).not.toHaveBeenCalled();
    });

    it('correctly creates a timestamp bytes buffer.', () => {
      const expectedHexValue = '000000005bcdcc09';
      const content = {
        text: 'Hello!',
      };
      const timestamp = 1540213769;

      const messageHashService = new MessageHashService(content, timestamp);
      const buffer = messageHashService['getTimestampBuffer'](timestamp);

      const hexValue = buffer.toString('hex');
      expect(hexValue).toBe(expectedHexValue);
    });

    it('correctly creates a markdown text bytes buffer.', () => {
      const expectedHashValue = 'f25a925d55116800e66872d2a82d8292adf1d4177195703f976bc884d32b5c94';

      const content = {
        text: 'This has **markdown**',
      };
      const timestamp = 1540213965000;

      const messageHashService = new MessageHashService(content, timestamp);

      const hashValue = messageHashService.getHash().toString('hex');
      expect(hashValue).toBe(expectedHashValue);
    });

    it('correctly creates an arabic text bytes buffer.', () => {
      const expectedHashValue = '5830012f6f14c031bf21aded5b07af6e2d02d01074f137d106d4645e4dc539ca';

      const content = {
        text: 'بغداد',
      };
      const timestamp = 1540213965000;

      const messageHashService = new MessageHashService(content, timestamp);

      const hashValue = messageHashService.getHash().toString('hex');
      expect(hashValue).toBe(expectedHashValue);
    });

    it('correctly creates an emoji text bytes buffer.', () => {
      const expectedHashValue = '4f8ee55a8b71a7eb7447301d1bd0c8429971583b15a91594b45dee16f208afd5';

      const content = {
        text: 'Hello 👩‍💻👨‍👩‍👧!',
      };
      const timestamp = 1540213769000;

      const messageHashService = new MessageHashService(content, timestamp);

      const hashValue = messageHashService.getHash().toString('hex');
      expect(hashValue).toBe(expectedHashValue);
    });

    it('correctly creates a link text bytes buffer.', () => {
      const expectedHashValue = 'ef39934807203191c404ebb3acba0d33ec9dce669f9acec49710d520c365b657';

      const content = {
        text: 'https://www.youtube.com/watch?v=DLzxrzFCyOs',
      };
      const timestamp = 1540213769000;

      const messageHashService = new MessageHashService(content, timestamp);

      const hashValue = messageHashService.getHash().toString('hex');
      expect(hashValue).toBe(expectedHashValue);
    });

    it('correctly creates a location bytes buffer.', () => {
      const expectedHashValue = '56a5fa30081bc16688574fdfbbe96c2eee004d1fb37dc714eec6efb340192816';

      const content = {
        latitude: 52.5166667,
        longitude: 13.4,
      };
      const timestamp = 1540213769000;

      const messageHashService = new MessageHashService(content, timestamp);

      const hashValue = messageHashService.getHash().toString('hex');
      expect(hashValue).toBe(expectedHashValue);
    });

    it('correctly creates another location bytes buffer.', () => {
      const expectedHashValue = '803b2698104f58772dbd715ec6ee5853d835df98a4736742b2a676b2217c9499';

      const content = {
        latitude: 51.509143,
        longitude: -0.117277,
      };
      const timestamp = 1540213769000;

      const messageHashService = new MessageHashService(content, timestamp);

      const hashValue = messageHashService.getHash().toString('hex');
      expect(hashValue).toBe(expectedHashValue);
    });

    it('correctly creates an asset bytes buffer.', () => {
      const expectedHashValue = 'bf20de149847ae999775b3cc88e5ff0c0382e9fa67b9d382b1702920b8afa1de';

      const content: AvailableMessageContent = {
        uploaded: {
          assetId: '3-2-1-38d4f5b9',
          otrKey: new Uint8Array(),
          sha256: new Uint8Array(),
        },
      };
      const timestamp = 1540213769000;

      const messageHashService = new MessageHashService(content, timestamp);

      const hashValue = messageHashService.getHash().toString('hex');
      expect(hashValue).toBe(expectedHashValue);
    });

    it('correctly creates another asset bytes buffer.', () => {
      const expectedHashValue = '2235f5b6c00d9b0917675399d0314c8401f0525457b00aa54a38998ab93b90d6';

      const content: AvailableMessageContent = {
        uploaded: {
          assetId: '3-3-3-82a62735',
          otrKey: new Uint8Array(),
          sha256: new Uint8Array(),
        },
      };
      const timestamp = 1540213965000;

      const messageHashService = new MessageHashService(content, timestamp);

      const hashValue = messageHashService.getHash().toString('hex');
      expect(hashValue).toBe(expectedHashValue);
    });
  });
});
