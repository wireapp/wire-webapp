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

import {AssetContentSchema, EventTableEntrySchema} from './data.schema';

describe('cross-platform backup schemas', () => {
  it('continues accepting event records without arbitrary data', () => {
    const validationResult = EventTableEntrySchema.safeParse({
      conversation: 'conversation-id',
      primary_key: 1,
      qualified_conversation: {id: 'conversation-id'},
      time: '2026-10-28T10:00:00.000Z',
      type: 'conversation.member-join',
    });

    expect(validationResult.success).toBe(true);
  });

  it('continues accepting asset content without arbitrary info and meta', () => {
    const validationResult = AssetContentSchema.safeParse({
      content_length: '0',
      content_type: 'application/octet-stream',
      key: 'asset-key',
      otr_key: {},
      sha256: {},
    });

    expect(validationResult.success).toBe(true);
  });
});
