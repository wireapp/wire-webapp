const StoreHelper = require('./StoreHelper');
const {Account} = require('@wireapp/core');
const {APIClient} = require('@wireapp/api-client');
const {Config} = require('@wireapp/api-client/dist/commonjs/Config');
const {ClientType} = require('@wireapp/api-client/dist/commonjs/client/');

module.exports = {
  getAccount: async function(email, password) {
    const login = {
      clientType: ClientType.TEMPORARY,
      email,
      password,
    };
    const backend = APIClient.BACKEND.STAGING;
    const engine = await StoreHelper.createMemoryEngine(email);
    const apiClient = new APIClient(new Config(engine, backend));
    const account = new Account(apiClient);
    await account.login(login);
    await account.listen();
    return account;
  },
};
