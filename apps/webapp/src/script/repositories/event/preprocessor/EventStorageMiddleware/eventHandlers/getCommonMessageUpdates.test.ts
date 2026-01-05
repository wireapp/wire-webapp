/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {StatusType} from 'src/script/message/StatusType';
import {createMessageAddEvent, toSavedEvent} from 'test/helper/EventGenerator';

import {getCommonMessageUpdates} from './getCommonMessageUpdates';

describe('getCommonMessageUpdates', () => {
  /** @see https://wearezeta.atlassian.net/browse/SQCORE-732 */
  it('does not overwrite the seen status if a message gets edited', () => {
    const originalEvent = toSavedEvent(createMessageAddEvent({overrides: {status: StatusType.SEEN}}));

    const editedEvent = createMessageAddEvent({
      text: 'Edited Text Which Replaces The Original Text',
      overrides: {
        read_receipts: [
          {
            time: '2021-06-10T19:47:19.570Z',
            userId: 'b661e27f-24c6-4c52-a425-87a7b7f3df61',
          },
        ],
      },
      dataOverrides: {replacing_message_id: originalEvent.id},
    });

    const updatedEvent = getCommonMessageUpdates(originalEvent, editedEvent) as any;
    expect(updatedEvent.data.content).toBe('Edited Text Which Replaces The Original Text');
    expect(updatedEvent.status).toBe(StatusType.SEEN);
    expect(Object.keys(updatedEvent.read_receipts).length).toBe(1);
  });
});
