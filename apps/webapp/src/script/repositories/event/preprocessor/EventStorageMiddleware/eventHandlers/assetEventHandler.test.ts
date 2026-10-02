/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {AssetTransferState} from 'Repositories/assets/assetTransferState';
import {createAssetAddEvent, toSavedEvent} from 'test/helper/EventGenerator';

import {handleAssetEvent} from './assetEventHandler';

describe('assetEventHandler retry selection', () => {
  it.each([
    {contentLength: 0, expectedOperation: 'delete'},
    {contentLength: NaN, expectedOperation: 'delete'},
    {contentLength: -1, expectedOperation: 'update'},
    {contentLength: 1, expectedOperation: 'update'},
  ])('preserves numeric retry truthiness for $contentLength', async options => {
    const {contentLength, expectedOperation} = options;
    const originalEvent = toSavedEvent(createAssetAddEvent({from: 'sender-id'}));
    const event = {
      ...originalEvent,
      data: {...originalEvent.data, status: AssetTransferState.UPLOAD_FAILED, content_length: contentLength},
    };

    const actualOperation = await handleAssetEvent(event, {
      duplicateEvent: originalEvent,
      selfUserId: 'other-user-id',
      findEvent: async () => {
        return undefined;
      },
    });

    expect(actualOperation?.type).toBe(expectedOperation);
  });
});
