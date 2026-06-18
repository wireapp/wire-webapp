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

import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {Text} from 'Repositories/entity/message/Text';
import {User} from 'Repositories/entity/User';

import {
  extractThreadPreviewFromEvent,
  extractThreadRootMetadataFromEvent,
  extractThreadRootMetadataFromMessage,
} from './threadMetadataUtils';

describe('threadMetadataUtils', () => {
  it('extracts preview from backend event payloads', () => {
    expect(extractThreadPreviewFromEvent({data: {content: '  hello  '}})).toBe('hello');
    expect(extractThreadPreviewFromEvent({data: {text: {content: 'thread text'}}})).toBe('thread text');
    expect(extractThreadPreviewFromEvent({data: {content: '   '}})).toBeUndefined();
  });

  it('extracts root metadata from backend events', () => {
    expect(
      extractThreadRootMetadataFromEvent({
        from: 'user-a',
        time: '2026-01-01T00:00:00.000Z',
        data: {content: 'Root message'},
      }),
    ).toEqual({
      rootMessagePreview: 'Root message',
      rootMessageAuthorId: 'user-a',
      rootMessageTimestamp: '2026-01-01T00:00:00.000Z',
    });
  });

  it('extracts root metadata from local text messages', () => {
    const user = new User('user-a', 'local');
    user.name('Ada Lovelace');

    const message = new ContentMessage('message-a');
    message.user(user);
    message.timestamp(Date.parse('2026-01-01T00:00:00.000Z'));
    message.addAsset(new Text('text-a', 'Root message'));

    expect(extractThreadRootMetadataFromMessage(message)).toEqual({
      rootMessagePreview: 'Root message',
      rootMessageAuthorId: 'user-a',
      rootMessageTimestamp: '2026-01-01T00:00:00.000Z',
    });
  });
});
