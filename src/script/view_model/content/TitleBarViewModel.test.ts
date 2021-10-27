/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {generateWarningBadgeKey} from './TitleBarViewModel';

describe('TitleBarViewModel', () => {
  describe('guest badge', () => {
    it.each([
      [
        {hasExternal: true, hasFederated: true, hasGuest: true, hasService: true},
        'guestRoomConversationBadgeFederatedAndExternalAndGuestAndService',
      ],
      [{hasFederated: true, hasGuest: true, hasService: true}, 'guestRoomConversationBadgeFederatedAndGuestAndService'],
      [
        {hasExternal: true, hasFederated: true, hasGuest: true},
        'guestRoomConversationBadgeFederatedAndExternalAndGuest',
      ],
      [
        {hasExternal: true, hasFederated: true, hasService: true},
        'guestRoomConversationBadgeFederatedAndExternalAndService',
      ],
      [{hasExternal: true, hasFederated: true}, 'guestRoomConversationBadgeFederatedAndExternal'],
      [{hasFederated: true, hasService: true}, 'guestRoomConversationBadgeFederatedAndService'],
      [{hasFederated: true, hasGuest: true}, 'guestRoomConversationBadgeFederatedAndGuest'],
      [{hasExternal: true, hasGuest: true, hasService: true}, 'guestRoomConversationBadgeExternalAndGuestAndService'],
      [{hasGuest: true, hasService: true}, 'guestRoomConversationBadgeGuestAndService'],
      [{hasExternal: true, hasGuest: true}, 'guestRoomConversationBadgeExternalAndGuest'],
      [{hasExternal: true, hasService: true}, 'guestRoomConversationBadgeExternalAndService'],
      [{hasExternal: true}, 'guestRoomConversationBadgeExternal'],
      [{hasService: true}, 'guestRoomConversationBadgeService'],
      [{hasGuest: true}, 'guestRoomConversationBadge'],
    ])('generates the right badge according to the conversation participants (%s)', (state, expected) => {
      expect(generateWarningBadgeKey(state)).toBe(expected);
    });
  });
});
