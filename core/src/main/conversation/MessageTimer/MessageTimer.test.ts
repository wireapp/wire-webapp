/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {MessageTimer} from './MessageTimer';

describe('TimerService', () => {
  describe('"getMessageTimer"', () => {
    it('returns 0 when no timer is set.', () => {
      const conversationId = 'a0e0f130-8c21-11df-92d9-95795a3bcd40';
      const messageTimer = new MessageTimer();
      const expiry = messageTimer.getMessageTimer(conversationId);
      expect(expiry).toBe(0);
    });

    it('returns the expiration timer when a local timer is set.', () => {
      const conversationId = 'a0e0f130-8c21-11df-92d9-95795a3bcd40';
      const messageTimer = new MessageTimer();
      const oneMinute = 60000;

      messageTimer.setMessageLevelTimer(conversationId, oneMinute);
      let expiry = messageTimer.getMessageTimer(conversationId);
      expect(expiry).toBe(oneMinute);

      expiry = messageTimer.getMessageLevelTimer(conversationId);
      expect(expiry).toBe(oneMinute);
    });

    it('returns the expiration timer when a global timer is set.', () => {
      const conversationId = 'a0e0f130-8c21-11df-92d9-95795a3bcd40';
      const messageTimer = new MessageTimer();
      const oneMinute = 60000;

      messageTimer.setConversationLevelTimer(conversationId, oneMinute);
      let expiry = messageTimer.getMessageTimer(conversationId);
      expect(expiry).toBe(oneMinute);

      expiry = messageTimer.getConversationLevelTimer(conversationId);
      expect(expiry).toBe(oneMinute);
    });

    it('returns the conversation level timer when a conversation level timer and a message level timer is set.', () => {
      const conversationId = 'a0e0f130-8c21-11df-92d9-95795a3bcd40';
      const messageTimer = new MessageTimer();

      const oneMinute = 60000;
      const twoMinutes = 120000;

      messageTimer.setMessageLevelTimer(conversationId, oneMinute);
      messageTimer.setConversationLevelTimer(conversationId, twoMinutes);

      const expiry = messageTimer.getMessageTimer(conversationId);
      expect(expiry).toBe(twoMinutes);
    });

    it('can remove the conversation level timer.', () => {
      const conversationId = 'a0e0f130-8c21-11df-92d9-95795a3bcd40';
      const messageTimer = new MessageTimer();
      const oneMinute = 60000;

      messageTimer.setMessageLevelTimer(conversationId, oneMinute);
      let expiry = messageTimer.getMessageLevelTimer(conversationId);
      expect(expiry).toBe(oneMinute);
      expect(messageTimer['messageLevelTimers'].size).toBe(1);

      messageTimer.setMessageLevelTimer(conversationId, 0);
      expiry = messageTimer.getMessageLevelTimer(conversationId);
      expect(expiry).toBe(0);
      expect(messageTimer['messageLevelTimers'].size).toBe(0);
    });

    it('can remove the message level timer.', () => {
      const conversationId = 'a0e0f130-8c21-11df-92d9-95795a3bcd40';
      const messageTimer = new MessageTimer();
      const oneMinute = 60000;

      messageTimer.setConversationLevelTimer(conversationId, oneMinute);
      let expiry = messageTimer.getConversationLevelTimer(conversationId);
      expect(expiry).toBe(oneMinute);
      expect(messageTimer['conversationLevelTimers'].size).toBe(1);

      messageTimer.setConversationLevelTimer(conversationId, 0);
      expiry = messageTimer.getConversationLevelTimer(conversationId);
      expect(expiry).toBe(0);
      expect(messageTimer['conversationLevelTimers'].size).toBe(0);
    });
  });
});
