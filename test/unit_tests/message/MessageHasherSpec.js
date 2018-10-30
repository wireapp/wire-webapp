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

// grunt test_init && grunt test_run:message/MessageHasher

'use strict';

describe('z.message.MessageHasher', () => {
  describe('hashEvent', () => {
    describe('text events', () => {
      it('correctly creates a markdown text hash', () => {
        const event = {
          data: {
            content: 'This has **markdown**',
          },
          time: new Date(1540213965),
          type: z.event.Client.CONVERSATION.MESSAGE_ADD,
        };
        const expectedHashValue = 'f25a925d55116800e66872d2a82d8292adf1d4177195703f976bc884d32b5c94';

        return z.message.MessageHasher.hashEvent(event).then(hashBytes => {
          const hashValue = z.util.StringUtil.bytesToHex(new Uint8Array(hashBytes));

          expect(hashValue).toBe(expectedHashValue);
        });
      });

      it('correctly creates an arabic text hash', () => {
        const event = {
          data: {
            content: 'بغداد',
          },
          time: new Date(1540213965),
          type: z.event.Client.CONVERSATION.MESSAGE_ADD,
        };
        const expectedHashValue = '5830012f6f14c031bf21aded5b07af6e2d02d01074f137d106d4645e4dc539ca';

        return z.message.MessageHasher.hashEvent(event).then(hashBytes => {
          const hashValue = z.util.StringUtil.bytesToHex(new Uint8Array(hashBytes));

          expect(hashValue).toBe(expectedHashValue);
        });
      });

      it('correctly creates an emoji text hash', () => {
        const event = {
          data: {
            content: 'Hello 👩‍💻👨‍👩‍👧!',
          },
          time: new Date(1540213769),
          type: z.event.Client.CONVERSATION.MESSAGE_ADD,
        };
        const expectedHashValue = '4f8ee55a8b71a7eb7447301d1bd0c8429971583b15a91594b45dee16f208afd5';

        return z.message.MessageHasher.hashEvent(event).then(hashBytes => {
          const hashValue = z.util.StringUtil.bytesToHex(new Uint8Array(hashBytes));

          expect(hashValue).toBe(expectedHashValue);
        });
      });

      it('correctly creates a link text hash', () => {
        const event = {
          data: {
            content: 'https://www.youtube.com/watch?v=DLzxrzFCyOs',
          },
          time: new Date(1540213769),
          type: z.event.Client.CONVERSATION.MESSAGE_ADD,
        };
        const expectedHashValue = 'ef39934807203191c404ebb3acba0d33ec9dce669f9acec49710d520c365b657';

        return z.message.MessageHasher.hashEvent(event).then(hashBytes => {
          const hashValue = z.util.StringUtil.bytesToHex(new Uint8Array(hashBytes));

          expect(hashValue).toBe(expectedHashValue);
        });
      });
    });

    describe('location events', () => {
      it('correctly creates a location hash', () => {
        const event = {
          conversation: '614c75c7-359a-41aa-b60c-08c3762bd5d2',
          data: {
            location: {
              latitude: 52.5166667,
              longitude: 13.4,
              name: 'Rosenthaler Str. 40-41, 10178 Berlin, Germany',
            },
          },
          time: new Date(1540213769),
          type: 'conversation.location',
        };
        const expectedHashValue = '56a5fa30081bc16688574fdfbbe96c2eee004d1fb37dc714eec6efb340192816';

        return z.message.MessageHasher.hashEvent(event).then(hashBytes => {
          const hashValue = z.util.StringUtil.bytesToHex(new Uint8Array(hashBytes));

          expect(hashValue).toBe(expectedHashValue);
        });
      });

      it('correctly creates another location hash with a negative value', () => {
        const event = {
          conversation: '614c75c7-359a-41aa-b60c-08c3762bd5d2',
          data: {
            location: {
              latitude: 51.509143,
              longitude: -0.117277,
              name: 'Rosenthaler Str. 40-41, 10178 Berlin, Germany',
            },
          },
          time: new Date(1540213769),
          type: 'conversation.location',
        };
        const expectedHashValue = '803b2698104f58772dbd715ec6ee5853d835df98a4736742b2a676b2217c9499';

        return z.message.MessageHasher.hashEvent(event).then(hashBytes => {
          const hashValue = z.util.StringUtil.bytesToHex(new Uint8Array(hashBytes));

          expect(hashValue).toBe(expectedHashValue);
        });
      });
    });

    describe('assets events', () => {
      it('correctly creates an asset hash.', () => {
        const event = {
          conversation: 'c3dfbc39-4e61-42e3-ab31-62800a0faeeb',
          data: {
            key: '3-2-1-38d4f5b9',
          },
          time: new Date(1540213769),
          type: 'conversation.asset-add',
        };
        const expectedHashValue = 'bf20de149847ae999775b3cc88e5ff0c0382e9fa67b9d382b1702920b8afa1de';

        return z.message.MessageHasher.hashEvent(event).then(hashBytes => {
          const hashValue = z.util.StringUtil.bytesToHex(new Uint8Array(hashBytes));

          expect(hashValue).toBe(expectedHashValue);
        });
      });

      it('correctly creates another file asset hash.', () => {
        const event = {
          conversation: 'c3dfbc39-4e61-42e3-ab31-62800a0faeeb',
          data: {
            key: '3-3-3-82a62735',
          },
          time: new Date(1540213965),
          type: 'conversation.asset-add',
        };
        const expectedHashValue = '2235f5b6c00d9b0917675399d0314c8401f0525457b00aa54a38998ab93b90d6';

        return z.message.MessageHasher.hashEvent(event).then(hashBytes => {
          const hashValue = z.util.StringUtil.bytesToHex(new Uint8Array(hashBytes));

          expect(hashValue).toBe(expectedHashValue);
        });
      });

      xit('correctly creates an image asset hash', () => {
        const expectedHashValue = 'bf20de149847ae999775b3cc88e5ff0c0382e9fa67b9d382b1702920b8afa1de';

        const assetId = '3-2-1-38d4f5b9';
        const timestamp = 1540213769;

        const imageAsset = new z.entity.MediumImage(assetId);
        imageAsset.resource({identifier: assetId});

        const messageEntity = new z.entity.ContentMessage(z.util.createRandomUuid());
        messageEntity.timestamp(timestamp);
        messageEntity.add_asset(imageAsset);

        return z.message.MessageHasher.getImageMessageHash(messageEntity).then(hashBytes => {
          const hashValue = z.util.StringUtil.bytesToHex(hashBytes);

          expect(hashValue).toBe(expectedHashValue);
        });
      });

      xit('correctly creates another image asset hash', () => {
        const expectedHashValue = '2235f5b6c00d9b0917675399d0314c8401f0525457b00aa54a38998ab93b90d6';

        const assetId = '3-3-3-82a62735';
        const timestamp = 1540213965;

        const imageAsset = new z.entity.MediumImage(assetId);
        imageAsset.resource({identifier: assetId});

        const messageEntity = new z.entity.ContentMessage(z.util.createRandomUuid());
        messageEntity.timestamp(timestamp);
        messageEntity.add_asset(imageAsset);

        return z.message.MessageHasher.getImageMessageHash(messageEntity).then(hashBytes => {
          const hashValue = z.util.StringUtil.bytesToHex(hashBytes);

          expect(hashValue).toBe(expectedHashValue);
        });
      });
    });
  });
});
