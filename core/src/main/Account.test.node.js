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

const {Account} = require('@wireapp/core');
const {AuthAPI} = require('@wireapp/api-client/dist/commonjs/auth/');
const {ClientAPI, ClientType} = require('@wireapp/api-client/dist/commonjs/client/');
const {Config} = require('@wireapp/api-client/dist/commonjs/Config');
const {ConversationAPI} = require('@wireapp/api-client/dist/commonjs/conversation/');
const {MemoryEngine} = require('@wireapp/store-engine');
const {NotificationAPI} = require('@wireapp/api-client/dist/commonjs/notification/');
const {StatusCode} = require('@wireapp/api-client/dist/commonjs/http/');
const APIClient = require('@wireapp/api-client');
const nock = require('nock');

const BASE_URL = 'mock-backend.wire.com';
const BASE_URL_HTTPS = `https://${BASE_URL}`;
const UUID4_REGEX = /(\w{8}(-\w{4}){3}-\w{12}?)/;

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

  describe('"login"', () => {
    const MOCK_BACKEND = {
      name: 'mock',
      rest: BASE_URL_HTTPS,
      ws: `wss://${BASE_URL}`,
    };

    const CLIENT_ID = '4e37b32f57f6da55';

    const accessTokenData = {
      access_token:
        'iJCRCjc8oROO-dkrkqCXOade997oa8Jhbz6awMUQPBQo80VenWqp_oNvfY6AnU5BxEsdDPOBfBP-uz_b0gAKBQ==.v=1.k=1.d=1498600993.t=a.l=.u=aaf9a833-ef30-4c22-86a0-9adc8a15b3b4.c=15037015562284012115',
      expires_in: 900,
      token_type: 'Bearer',
      user: 'aaf9a833-ef30-4c22-86a0-9adc8a15b3b4',
    };

    beforeEach(() => {
      nock(BASE_URL_HTTPS)
        .post(`${AuthAPI.URL.LOGIN}`, body => {
          return body.email && body.password;
        })
        .query(queryObject => true)
        .reply((uri, body) => {
          const parsedBody = JSON.parse(body);
          if (parsedBody.password === 'wrong') {
            return [
              StatusCode.FORBIDDEN,
              JSON.stringify({
                code: StatusCode.FORBIDDEN,
                label: 'invalid-credentials',
                message: 'Authentication failed.',
              }),
            ];
          }
          return [StatusCode.OK, JSON.stringify(accessTokenData)];
        });

      nock(BASE_URL_HTTPS)
        .post(`${AuthAPI.URL.ACCESS}/${AuthAPI.URL.LOGOUT}`)
        .reply(StatusCode.OK, undefined);

      nock(BASE_URL_HTTPS)
        .post(ClientAPI.URL.CLIENTS)
        .reply(StatusCode.OK, {id: CLIENT_ID});

      nock(BASE_URL_HTTPS)
        .post(
          new RegExp(
            `${ConversationAPI.URL.CONVERSATIONS}/.*/${ConversationAPI.URL.OTR}/${ConversationAPI.URL.MESSAGES}`
          )
        )
        .query({ignore_missing: false})
        .reply(StatusCode.OK)
        .persist();

      nock(BASE_URL_HTTPS)
        .get(`${NotificationAPI.URL.NOTIFICATION}/${NotificationAPI.URL.LAST}`)
        .query({client: CLIENT_ID})
        .reply(StatusCode.OK, {});

      nock(BASE_URL_HTTPS)
        .get(ClientAPI.URL.CLIENTS)
        .reply(StatusCode.OK, [{id: CLIENT_ID}]);
    });

    it('logs in with correct credentials', async done => {
      const storeEngine = new MemoryEngine();
      await storeEngine.init('account.test');

      const config = new Config(storeEngine, MOCK_BACKEND);
      const apiClient = new APIClient(config);
      const account = new Account(apiClient);

      await account.init();
      const {clientId, clientType, userId} = await account.login({
        clientType: ClientType.TEMPORARY,
        email: 'hello@example.com',
        password: 'my-secret',
      });

      expect(clientId).toBe(CLIENT_ID);
      expect(userId).toMatch(UUID4_REGEX);
      expect(clientType).toBe(ClientType.TEMPORARY);

      done();
    });

    it('does not log in with incorrect credentials', async done => {
      const storeEngine = new MemoryEngine();
      await storeEngine.init('account.test');

      const config = new Config(storeEngine, MOCK_BACKEND);
      const apiClient = new APIClient(config);
      const account = new Account(apiClient);

      await account.init();

      try {
        await account.login({
          clientType: ClientType.TEMPORARY,
          email: 'hello@example.com',
          password: 'wrong',
        });

        done.fail('Should not be logged in');
      } catch (error) {
        const {
          status: errorCode,
          data: {message: errorMessage},
        } = error.response;

        expect(errorCode).toBe(StatusCode.FORBIDDEN);
        expect(errorMessage).toBe('Authentication failed.');

        done();
      }
    });
  });
});
