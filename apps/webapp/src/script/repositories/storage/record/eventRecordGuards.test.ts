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

import type {EventRecord} from './eventRecord';
import {hasQuoteForMessage} from './eventRecordGuards';

import {ClientEvent} from '../../event/client';

describe('hasQuoteForMessage', () => {
  it('rejects a null quote read from serialized event storage', () => {
    const record = JSON.parse('{"type":"conversation.message-add","data":{"quote":null}}') as EventRecord;

    expect(hasQuoteForMessage(record, 'quoted-id')).toBe(false);
  });

  it.each([null, false, 0, '', undefined, [], {}, {message_id: 'other-id'}, {message_id: 'quoted-id'}])(
    'validates legacy quote payload %p before matching the message ID',
    quote => {
      const baseRecord = {
        primary_key: 'event-key',
        category: 0,
        conversation: 'conversation-id',
        id: 'reply-id',
        time: '2026-09-30T10:00:00.000Z',
      };
      const messageRecord = {
        ...baseRecord,
        type: ClientEvent.CONVERSATION.MESSAGE_ADD,
        data: {quote},
      } as unknown as EventRecord;
      const multipartRecord = {
        ...baseRecord,
        type: ClientEvent.CONVERSATION.MULTIPART_MESSAGE_ADD,
        data: {text: {quote}, attachments: []},
      } as unknown as EventRecord;
      const expectedMatch =
        typeof quote === 'object' && quote !== null && 'message_id' in quote && quote.message_id === 'quoted-id';

      expect(hasQuoteForMessage(messageRecord, 'quoted-id')).toBe(expectedMatch);
      expect(hasQuoteForMessage(multipartRecord, 'quoted-id')).toBe(expectedMatch);
    },
  );

  it.each([null, false, 0, '', undefined])('rejects a missing or falsy multipart text payload %p', text => {
    const record = {
      type: ClientEvent.CONVERSATION.MULTIPART_MESSAGE_ADD,
      data: {text, attachments: []},
    } as unknown as EventRecord;

    expect(hasQuoteForMessage(record, 'quoted-id')).toBe(false);
  });
});
