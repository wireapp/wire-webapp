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

const buildConversationEphemeralHandler = () => {
  const conversationMapper = new z.conversation.ConversationMapper();
  const conversationService = new z.conversation.ConversationService(null, null);
  return new z.conversation.ConversationEphemeralHandler(conversationService, conversationMapper, () => {});
};

describe('z.conversation.ConversationEphemeralHandler', () => {
  describe('_updateEphemeralTimer', () => {
    it("should update timer according to the event's data", () => {
      const conversationEphemeralHandler = buildConversationEphemeralHandler();
      const testedTimers = [
        {expected: 1000, value: 1000},
        {expected: 36000000, value: 36000000},
        {expected: null, value: null},
      ];

      return testedTimers.map(timerDesc => {
        const conversationEntity = new z.entity.Conversation();
        const event = {data: {message_timer: timerDesc.value}};
        return conversationEphemeralHandler._updateEphemeralTimer(conversationEntity, event).then(() => {
          expect(conversationEntity.globalMessageTimer()).toBe(timerDesc.expected);
        });
      });
    });
  });
});
