/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {CallingEpochCache} from './CallingEpochCache';

describe('CallingEpochCache', () => {
  let cache: CallingEpochCache;
  const epochData = [
    {
      serializedConversationId: '12345@wire.com',
      epoch: 1,
      clients: {convid: '12345', clients: [{userid: '56', clientid: '561', in_subconv: true}]},
      secretKey: 'xbnbvzfufzuewz',
    },
    {
      serializedConversationId: '12345@wire.com',
      epoch: 1,
      clients: {
        convid: '12345',
        clients: [
          {userid: '56', clientid: '561', in_subconv: false},
          {userid: '44', clientid: '441', in_subconv: true},
        ],
      },
      secretKey: 'abcdrsrsrsr',
    },
    {
      serializedConversationId: '12345@wire.com',
      epoch: 1,
      clients: {convid: '12345', clients: [{userid: '56', clientid: '561', in_subconv: true}]},
      secretKey: 'dsdsdsderer',
    },
  ];
  beforeEach(() => {
    cache = new CallingEpochCache();
    epochData.forEach(d => cache.store(d));
  });

  describe('Cache', () => {
    it('starts disabled', async () => {
      expect(cache.isEnabled()).toBeFalsy();
    });

    it('can be enable and disable', async () => {
      expect(cache.isEnabled()).toBeFalsy();

      cache.enable();
      expect(cache.isEnabled()).toBeTruthy();

      cache.disable();
      expect(cache.isEnabled()).toBeFalsy();
    });

    it('can be cleaned', async () => {
      cache.clean();
      expect(cache.getEpochList()).toEqual([]);
    });

    it('can get epoch data', async () => {
      expect(cache.getEpochList()).toEqual(epochData);
    });

    it('can store epoch data', async () => {
      const newEpoch = {
        serializedConversationId: '12345@wire.com',
        epoch: 1,
        clients: {
          convid: '12345',
          clients: [
            {userid: '56', clientid: '561', in_subconv: false},
            {userid: '22', clientid: '221', in_subconv: true},
          ],
        },
        secretKey: 'dssdgsgsdgsdds',
      };
      cache.store(newEpoch);
      expect(cache.getEpochList()).toEqual([...epochData, newEpoch]);
    });
  });
});
