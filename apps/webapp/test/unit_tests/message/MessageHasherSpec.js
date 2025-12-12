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

import {ClientEvent} from 'Repositories/event/Client';
import {MessageHasher} from 'src/script/message/MessageHasher';
import {bytesToHex} from 'Util/StringUtil';

describe('MessageHasher', () => {
  describe('hashEvent', () => {
    describe('unhandled event type', () => {
      it('throws if the event type is not handled', () => {
        const event = {
          type: ClientEvent.CONVERSATION.KNOCK,
        };

        expect(() => MessageHasher.hashEvent(event)).toThrow();
      });
    });

    describe('text events', () => {
      it('correctly hashes text events', () => {
        const tests = [
          {
            event: createTextEvent('This has **markdown**', 1540213965000),
            expectedHashValue: 'f25a925d55116800e66872d2a82d8292adf1d4177195703f976bc884d32b5c94',
          },
          {
            event: createTextEvent('بغداد', 1540213965000),
            expectedHashValue: '5830012f6f14c031bf21aded5b07af6e2d02d01074f137d106d4645e4dc539ca',
          },
          {
            event: createTextEvent('Hello 👩‍💻👨‍👩‍👧!', 1540213769000),
            expectedHashValue: '4f8ee55a8b71a7eb7447301d1bd0c8429971583b15a91594b45dee16f208afd5',
          },
          {
            event: createTextEvent('https://www.youtube.com/watch?v=DLzxrzFCyOs', 1540213769000),
            expectedHashValue: 'ef39934807203191c404ebb3acba0d33ec9dce669f9acec49710d520c365b657',
          },
        ];

        const testPromises = tests.map(({event, expectedHashValue}) => {
          return MessageHasher.hashEvent(event).then(hashBytes => {
            const hashValue = bytesToHex(new Uint8Array(hashBytes));

            expect(hashValue).toBe(expectedHashValue);
          });
        });

        return Promise.all(testPromises);
      });
    });

    describe('location events', () => {
      it('correctly hashes location events', () => {
        const tests = [
          {
            event: createLocationEvent(52.5166667, 13.4, 1540213769000),
            expectedHashValue: '56a5fa30081bc16688574fdfbbe96c2eee004d1fb37dc714eec6efb340192816',
          },

          {
            event: createLocationEvent(51.509143, -0.117277, 1540213769000),
            expectedHashValue: '803b2698104f58772dbd715ec6ee5853d835df98a4736742b2a676b2217c9499',
          },
        ];

        const testPromises = tests.map(({event, expectedHashValue}) => {
          return MessageHasher.hashEvent(event).then(hashBytes => {
            const hashValue = bytesToHex(new Uint8Array(hashBytes));

            expect(hashValue).toBe(expectedHashValue);
          });
        });

        return Promise.all(testPromises);
      });
    });

    describe('assets events', () => {
      it('correctly hashes asset events', () => {
        const tests = [
          {
            event: createAssetEvent('3-2-1-38d4f5b9', 1540213769000),
            expectedHashValue: 'bf20de149847ae999775b3cc88e5ff0c0382e9fa67b9d382b1702920b8afa1de',
          },

          {
            event: createAssetEvent('3-3-3-82a62735', 1540213965000),
            expectedHashValue: '2235f5b6c00d9b0917675399d0314c8401f0525457b00aa54a38998ab93b90d6',
          },

          {
            event: createAssetEvent('3-2-1-38d4f5b9', 1540213769000),
            expectedHashValue: 'bf20de149847ae999775b3cc88e5ff0c0382e9fa67b9d382b1702920b8afa1de',
          },

          {
            event: createAssetEvent('3-3-3-82a62735', 1540213965000),
            expectedHashValue: '2235f5b6c00d9b0917675399d0314c8401f0525457b00aa54a38998ab93b90d6',
          },
        ];

        const testPromises = tests.map(({event, expectedHashValue}) => {
          return MessageHasher.hashEvent(event).then(hashBytes => {
            const hashValue = bytesToHex(new Uint8Array(hashBytes));

            expect(hashValue).toBe(expectedHashValue);
          });
        });

        return Promise.all(testPromises);
      });
    });
  });

  function createAssetEvent(key, timestamp) {
    return {
      data: {
        key,
      },
      time: new Date(timestamp),
      type: ClientEvent.CONVERSATION.ASSET_ADD,
    };
  }
  function createTextEvent(text, timestamp) {
    return {
      data: {
        content: text,
      },
      time: new Date(timestamp),
      type: ClientEvent.CONVERSATION.MESSAGE_ADD,
    };
  }

  function createLocationEvent(latitude, longitude, timestamp) {
    return {
      data: {
        location: {
          latitude,
          longitude,
        },
      },
      time: new Date(timestamp),
      type: ClientEvent.CONVERSATION.LOCATION,
    };
  }
});
