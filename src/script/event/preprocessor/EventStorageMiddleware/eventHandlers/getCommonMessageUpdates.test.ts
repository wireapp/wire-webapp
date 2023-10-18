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

import {ClientEvent} from 'src/script/event/Client';
import {StatusType} from 'src/script/message/StatusType';

import {getCommonMessageUpdates} from './getCommonMessageUpdates';

describe('getCommonMessageUpdates', () => {
  /** @see https://wearezeta.atlassian.net/browse/SQCORE-732 */
  it('does not overwrite the seen status if a message gets edited', () => {
    const originalEvent = {
      category: 16,
      conversation: 'a7f1187e-9396-44c9-8242-db9d3051dc89',
      data: {
        content: 'Original Text Which Has Been Seen By Someone Else',
        expects_read_confirmation: true,
        legal_hold_status: 1,
        mentions: [],
        previews: [],
      },
      from: '24de8432-03ba-439f-88f8-95bdc68b7bdd',
      from_client_id: '79618bbe93e6821c',
      id: 'c6269e58-fa82-4f6e-8264-263e09154871',
      primary_key: '17',
      read_receipts: [
        {
          time: '2021-06-10T19:47:19.570Z',
          userId: 'b661e27f-24c6-4c52-a425-87a7b7f3df61',
        },
      ],
      status: StatusType.SEEN,
      time: '2021-06-10T19:47:16.071Z',
      type: ClientEvent.CONVERSATION.MESSAGE_ADD,
    } as any;

    const editedEvent = {
      conversation: 'a7f1187e-9396-44c9-8242-db9d3051dc89',
      data: {
        content: 'Edited Text Which Replaces The Original Text',
        expects_read_confirmation: true,
        mentions: [],
        previews: [],
        replacing_message_id: 'c6269e58-fa82-4f6e-8264-263e09154871',
      },
      from: '24de8432-03ba-439f-88f8-95bdc68b7bdd',
      from_client_id: '79618bbe93e6821c',
      id: 'caff044b-cb9c-47c6-833a-d4b76c678bcd',
      status: StatusType.SENT,
      time: '2021-06-10T19:47:23.706Z',
      type: ClientEvent.CONVERSATION.MESSAGE_ADD,
    } as any;

    const updatedEvent = getCommonMessageUpdates(originalEvent, editedEvent);
    expect(updatedEvent.data.content).toBe('Edited Text Which Replaces The Original Text');
    expect(updatedEvent.status).toBe(StatusType.SEEN);
    expect(Object.keys((updatedEvent as any).read_receipts).length).toBe(1);
  });
});
