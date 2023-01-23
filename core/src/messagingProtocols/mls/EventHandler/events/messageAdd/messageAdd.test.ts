/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event';

import {isMLSMessageAddEvent} from './messageAdd';

import {BackendEvent} from '../../EventHandler.types';

describe('MLS messageAdd eventHandler', () => {
  describe('isMessageAdd', () => {
    it('returns true for a messageAdd event', () => {
      const event = {
        type: CONVERSATION_EVENT.MLS_MESSAGE_ADD,
      } as BackendEvent;
      expect(isMLSMessageAddEvent(event)).toBe(true);
    });

    it('returns false for a non-messageAdd event', () => {
      const event = {
        type: CONVERSATION_EVENT.MEMBER_JOIN,
      } as BackendEvent;
      expect(isMLSMessageAddEvent(event)).toBe(false);
    });
  });
});
