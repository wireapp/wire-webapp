const {TimerService} = require('../../../dist/conversation/root');

describe('TimerService', () => {
  describe('"getMessageTimer"', () => {
    it('returns 0 when no timer is set.', () => {
      const conversationId = 'a0e0f130-8c21-11df-92d9-95795a3bcd40';
      const timerService = new TimerService();
      const expiry = timerService.getMessageTimer(conversationId);
      expect(expiry).toBe(0);
    });

    it('returns 0 for invalid conversation IDs.', () => {
      const conversationId = true;
      const timerService = new TimerService();
      const expiry = timerService.getMessageTimer(conversationId);
      expect(expiry).toBe(0);
    });

    it('returns the expiration timer when a local timer is set.', () => {
      const conversationId = 'a0e0f130-8c21-11df-92d9-95795a3bcd40';
      const timerService = new TimerService();
      const oneMinute = 60000;

      timerService.setMessageLevelTimer(conversationId, oneMinute);
      let expiry = timerService.getMessageTimer(conversationId);
      expect(expiry).toBe(oneMinute);

      expiry = timerService.getMessageLevelTimer(conversationId);
      expect(expiry).toBe(oneMinute);
    });

    it('returns the expiration timer when a global timer is set.', () => {
      const conversationId = 'a0e0f130-8c21-11df-92d9-95795a3bcd40';
      const timerService = new TimerService();
      const oneMinute = 60000;

      timerService.setConversationLevelTimer(conversationId, oneMinute);
      let expiry = timerService.getMessageTimer(conversationId);
      expect(expiry).toBe(oneMinute);

      expiry = timerService.getConversationLevelTimer(conversationId);
      expect(expiry).toBe(oneMinute);
    });

    it('returns the conversation level timer when a conversation level timer and a message level timer is set.', () => {
      const conversationId = 'a0e0f130-8c21-11df-92d9-95795a3bcd40';
      const timerService = new TimerService();

      const oneMinute = 60000;
      const twoMinutes = 120000;

      timerService.setMessageLevelTimer(conversationId, oneMinute);
      timerService.setConversationLevelTimer(conversationId, twoMinutes);

      const expiry = timerService.getMessageTimer(conversationId);
      expect(expiry).toBe(twoMinutes);
    });

    it('can remove the conversation level timer.', () => {
      const conversationId = 'a0e0f130-8c21-11df-92d9-95795a3bcd40';
      const timerService = new TimerService();
      const oneMinute = 60000;

      timerService.setMessageLevelTimer(conversationId, oneMinute);
      let expiry = timerService.getMessageLevelTimer(conversationId);
      expect(expiry).toBe(oneMinute);
      expect(timerService.messageLevelTimers.size).toBe(1);

      timerService.setMessageLevelTimer(conversationId, 0);
      expiry = timerService.getMessageLevelTimer();
      expect(expiry).toBe(0);
      expect(timerService.messageLevelTimers.size).toBe(0);
    });

    it('can remove the message level timer.', () => {
      const conversationId = 'a0e0f130-8c21-11df-92d9-95795a3bcd40';
      const timerService = new TimerService();
      const oneMinute = 60000;

      timerService.setConversationLevelTimer(conversationId, oneMinute);
      let expiry = timerService.getConversationLevelTimer(conversationId);
      expect(expiry).toBe(oneMinute);
      expect(timerService.conversationLevelTimers.size).toBe(1);

      timerService.setConversationLevelTimer(conversationId, 0);
      expiry = timerService.getConversationLevelTimer();
      expect(expiry).toBe(0);
      expect(timerService.conversationLevelTimers.size).toBe(0);
    });
  });
});
