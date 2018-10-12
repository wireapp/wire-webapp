const {MessageTimer} = require('../../../dist/conversation/');

describe('TimerService', () => {
  describe('"getMessageTimer"', () => {
    it('returns 0 when no timer is set.', () => {
      const conversationId = 'a0e0f130-8c21-11df-92d9-95795a3bcd40';
      const messageTimer = new MessageTimer();
      const expiry = messageTimer.getMessageTimer(conversationId);
      expect(expiry).toBe(0);
    });

    it('returns 0 for invalid conversation IDs.', () => {
      const conversationId = true;
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
      expect(messageTimer.messageLevelTimers.size).toBe(1);

      messageTimer.setMessageLevelTimer(conversationId, 0);
      expiry = messageTimer.getMessageLevelTimer();
      expect(expiry).toBe(0);
      expect(messageTimer.messageLevelTimers.size).toBe(0);
    });

    it('can remove the message level timer.', () => {
      const conversationId = 'a0e0f130-8c21-11df-92d9-95795a3bcd40';
      const messageTimer = new MessageTimer();
      const oneMinute = 60000;

      messageTimer.setConversationLevelTimer(conversationId, oneMinute);
      let expiry = messageTimer.getConversationLevelTimer(conversationId);
      expect(expiry).toBe(oneMinute);
      expect(messageTimer.conversationLevelTimers.size).toBe(1);

      messageTimer.setConversationLevelTimer(conversationId, 0);
      expiry = messageTimer.getConversationLevelTimer();
      expect(expiry).toBe(0);
      expect(messageTimer.conversationLevelTimers.size).toBe(0);
    });
  });
});
