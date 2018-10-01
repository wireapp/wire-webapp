const nock = require('nock');

const {Account} = require('@wireapp/core');
const {UserAPI} = require('@wireapp/api-client/dist/commonjs/user/');
const {StatusCode} = require('@wireapp/api-client/dist/commonjs/http/');
const {Backend} = require('@wireapp/api-client/dist/commonjs/env/');

const PayloadHelper = require('../test/PayloadHelper');

const HTTPS_URL = Backend.PRODUCTION.rest;

describe('UserService', () => {
  beforeAll(() => {
    nock(HTTPS_URL)
      .get(`${UserAPI.URL.USERS}`)
      .query(() => true)
      .reply(uri => {
        const ids = PayloadHelper.getUrlParameter(uri, 'ids');

        const userPayloads = ids.split(',').map(requestedUserId => {
          return PayloadHelper.mockUserPayload(requestedUserId);
        });

        return [StatusCode.OK, JSON.stringify(userPayloads)];
      })
      .persist();
  });

  describe('getUsers', () => {
    it('fetches users', async () => {
      const userIds = [PayloadHelper.getUUID(), PayloadHelper.getUUID()];
      const account = new Account();
      await account.init();
      const users = await account.service.user.getUsers(userIds);
      expect(users.length).toBe(userIds.length);
    });
  });
});
