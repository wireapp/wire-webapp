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

import {ContentMessage} from 'Repositories/entity/message/contentMessage';
import type {EventService} from 'Repositories/event/eventService';
import {translateForTest} from 'Util/test/translateForTest';

import {ConversationEphemeralHandler} from './conversationEphemeralHandler';

describe('ConversationEphemeralHandler', () => {
  it.each([
    {expiration: false, isRetained: true, isTracked: false},
    {expiration: 0, isRetained: true, isTracked: true},
    {expiration: Number.NaN, isRetained: true, isTracked: true},
    {expiration: -1, isRetained: true, isTracked: true},
    {expiration: 1, isRetained: true, isTracked: true},
    {expiration: '0', isRetained: false, isTracked: false},
  ])('preserves expiry representation $expiration during validation', async options => {
    const {expiration, isRetained, isTracked} = options;
    const message = new ContentMessage('timed-message', translateForTest);
    message.ephemeral_expires(expiration);
    const onMessageTimeout = jest.fn();
    const ephemeralHandler = new ConversationEphemeralHandler({} as EventService, {onMessageTimeout});

    try {
      const validatedMessages = await ephemeralHandler.validateMessages([message]);

      expect(validatedMessages).toEqual(isRetained ? [message] : []);
      expect(ephemeralHandler.timedMessages()).toEqual(isTracked ? [message] : []);
      expect(onMessageTimeout).toHaveBeenCalledTimes(isRetained ? 0 : 1);
    } finally {
      ephemeralHandler.timedMessages.removeAll();
      ephemeralHandler.dispose();
    }
  });
});
