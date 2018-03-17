const {Account} = require('@wireapp/core');
const {IndexedDBEngine} = require('@wireapp/store-engine');
const Client = require('@wireapp/api-client');

describe('Account', () => {
  describe('"initClient"', () => {
    let storeName = undefined;

    afterEach(() => {
      if (storeName) {
        window.indexedDB.deleteDatabase(storeName);
      }
    });

    it('creates a client if there is none', async done => {
      const engine = new IndexedDBEngine();
      const apiClient = new Client({
        schemaCallback: db => {
          db.version(1).stores({
            authentication: '',
            clients: ', meta.primary_key',
            keys: '',
            prekeys: '',
          });
        },
        store: engine,
        urls: Client.BACKEND.STAGING,
      });

      const context = {
        clientId: 'aa9ecc1b-ed3a-49fc-987d-68d69ce59c0d',
        userId: 'c213e4ac-ab40-406f-b67e-d5b2687c3345',
      };

      const account = new Account(apiClient);
      spyOn(account, 'registerClient');

      try {
        await account.init();
        await apiClient.initEngine(context);
        storeName = engine.storeName;
        await account.initClient(context);
      } catch (error) {
        return done.fail(error);
      }

      expect(account.registerClient).toHaveBeenCalledTimes(1);
      done();
    });
  });
});
