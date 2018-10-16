/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

'use strict';

// grunt test_init && grunt test_run:tracking/EventTrackingRepository

describe('z.tracking.helpers', () => {
  describe('getConversationType', () => {
    it('returns correct type for one on one conversation', () => {
      const conversation_et = new z.entity.Conversation(z.util.createRandomUuid());
      conversation_et.type(z.conversation.ConversationType.ONE2ONE);

      expect(z.tracking.helpers.getConversationType(conversation_et)).toBe(
        z.tracking.attribute.ConversationType.ONE_TO_ONE
      );
    });

    it('returns correct type for group conversation', () => {
      const conversation_et = new z.entity.Conversation(z.util.createRandomUuid());
      conversation_et.type(z.conversation.ConversationType.GROUP);

      expect(z.tracking.helpers.getConversationType(conversation_et)).toBe(z.tracking.attribute.ConversationType.GROUP);
    });

    it('returns undefined if type cannot be determined', () => {
      expect(z.tracking.helpers.getConversationType({})).not.toBeDefined();
      expect(z.tracking.helpers.getConversationType()).not.toBeDefined();
    });
  });
});
