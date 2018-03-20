const {Account} = require('@wireapp/core');

describe('Account', () => {
  describe('"init"', () => {
    it('initializes the Protocol buffers', async done => {
      const account = new Account();

      expect(account.service).not.toBeDefined();
      expect(account.protocolBuffers.GenericMessage).not.toBeDefined();

      await account.init();

      expect(account.service.conversation).toBeDefined();
      expect(account.service.cryptography).toBeDefined();

      const message = account.protocolBuffers.GenericMessage.create({
        messageId: '2d7cb6d8-118f-11e8-b642-0ed5f89f718b',
        text: account.protocolBuffers.Text.create({content: 'Hello, World!'}),
      });

      expect(message.content).toBe('text');
      done();
    });
  });
});
