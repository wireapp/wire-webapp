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

const nock = require('nock');
const {Account} = require('@wireapp/core');
const {PayloadBundleState, PayloadBundleType} = require('@wireapp/core/dist/conversation/');
const {APIClient} = require('@wireapp/api-client');
const {AuthAPI} = require('@wireapp/api-client/dist/commonjs/auth/');
const {BackendErrorLabel, StatusCode} = require('@wireapp/api-client/dist/commonjs/http/');
const {ClientAPI, ClientType} = require('@wireapp/api-client/dist/commonjs/client/');
const {ConversationAPI} = require('@wireapp/api-client/dist/commonjs/conversation/');
const {GenericMessage, Text} = require('@wireapp/protocol-messaging');
const {MemoryEngine} = require('@wireapp/store-engine');
const {NotificationAPI} = require('@wireapp/api-client/dist/commonjs/notification/');
const {ValidationUtil} = require('@wireapp/commons');
const {WebSocketTopic} = require('@wireapp/api-client/dist/commonjs/tcp/');
const {Server: MockSocketServer} = require('mock-socket');

const BASE_URL = 'mock-backend.wire.com';
const MOCK_BACKEND = {
  name: 'mock',
  rest: `https://${BASE_URL}`,
  ws: `wss://${BASE_URL}`,
};

async function createAccount(storageName = `test-${Date.now()}`) {
  const storeEngine = new MemoryEngine();
  await storeEngine.init(storageName);

  const apiClient = new APIClient({store: storeEngine, urls: MOCK_BACKEND});
  return new Account(apiClient);
}

describe('Account', () => {
  const CLIENT_ID = '4e37b32f57f6da55';

  const accessTokenData = {
    access_token:
      'iJCRCjc8oROO-dkrkqCXOade997oa8Jhbz6awMUQPBQo80VenWqp_oNvfY6AnU5BxEsdDPOBfBP-uz_b0gAKBQ==.v=1.k=1.d=1498600993.t=a.l=.u=aaf9a833-ef30-4c22-86a0-9adc8a15b3b4.c=15037015562284012115',
    expires_in: 900,
    token_type: 'Bearer',
    user: 'aaf9a833-ef30-4c22-86a0-9adc8a15b3b4',
  };

  beforeEach(() => {
    nock(MOCK_BACKEND.rest)
      .post(AuthAPI.URL.LOGIN, body => body.email && body.password)
      .query(() => true)
      .reply((uri, body) => {
        if (body.password === 'wrong') {
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

    nock(MOCK_BACKEND.rest)
      .post(`${AuthAPI.URL.ACCESS}/${AuthAPI.URL.LOGOUT}`)
      .reply(StatusCode.OK, undefined);

    nock(MOCK_BACKEND.rest)
      .post(AuthAPI.URL.ACCESS)
      .reply(StatusCode.OK, accessTokenData);

    nock(MOCK_BACKEND.rest)
      .post(ClientAPI.URL.CLIENTS)
      .reply(StatusCode.OK, {id: CLIENT_ID});

    nock(MOCK_BACKEND.rest)
      .post(
        new RegExp(
          `${ConversationAPI.URL.CONVERSATIONS}/.*/${ConversationAPI.URL.OTR}/${ConversationAPI.URL.MESSAGES}`,
        ),
      )
      .query({ignore_missing: false})
      .reply(StatusCode.OK)
      .persist();

    nock(MOCK_BACKEND.rest)
      .get(`${NotificationAPI.URL.NOTIFICATION}/${NotificationAPI.URL.LAST}`)
      .query({client: CLIENT_ID})
      .reply(StatusCode.OK, {});

    nock(MOCK_BACKEND.rest)
      .get(ClientAPI.URL.CLIENTS)
      .reply(StatusCode.OK, [{id: CLIENT_ID}]);
  });

  describe('"createText"', () => {
    it('creates a text payload', async () => {
      const account = await createAccount();
      expect(account.apiClient.context).toBeUndefined();

      await account.init();

      await account.login({
        clientType: ClientType.TEMPORARY,
        email: 'hello@example.com',
        password: 'my-secret',
      });

      expect(account.apiClient.context.userId).toBeDefined();

      const text = 'FIFA World Cup';
      const payload = account.service.conversation.messageBuilder.createText(text).build();

      expect(payload.timestamp).toBeGreaterThan(0);
    });
  });

  describe('"init"', () => {
    it('initializes the Protocol buffers', async () => {
      const account = new Account();

      await account.init();

      expect(account.service.conversation).toBeDefined();
      expect(account.service.cryptography).toBeDefined();

      const message = GenericMessage.create({
        messageId: '2d7cb6d8-118f-11e8-b642-0ed5f89f718b',
        text: Text.create({content: 'Hello, World!'}),
      });

      expect(message.content).toBe('text');
    });
  });

  describe('"mapConversationEvent"', () => {
    it('maps "conversation.message-timer-update" events', () => {
      const event = {
        conversation: 'ed5e4cd5-85ab-4d9e-be59-4e1c0324a9d4',
        data: {
          message_timer: 2419200000,
        },
        from: '39b7f597-dfd1-4dff-86f5-fe1b79cb70a0',
        time: '2018-08-01T09:40:25.481Z',
        type: 'conversation.message-timer-update',
      };

      const account = new Account();
      const incomingEvent = account.mapConversationEvent(event);

      expect(incomingEvent.content).toBe(event.data);
      expect(incomingEvent.conversation).toBe(event.conversation);
      expect(incomingEvent.from).toBe(event.from);
      expect(typeof incomingEvent.id).toBe('string');
      expect(incomingEvent.messageTimer).toBe(0);
      expect(incomingEvent.state).toBe(PayloadBundleState.INCOMING);
      expect(incomingEvent.timestamp).toBe(new Date(event.time).getTime());
      expect(incomingEvent.type).toBe(PayloadBundleType.TIMER_UPDATE);
    });

    it('maps "conversation.member-join" events', () => {
      const event = {
        conversation: '87591650-8676-430f-985f-dec8583f58cb',
        data: {
          user_ids: [
            'e023c681-7e51-43dd-a5d8-0f821e70a9c0',
            'b8a09877-7b73-4636-a664-95b2bda193b0',
            '5b068afd-1ef2-4860-9fbb-9c3c70a22f97',
          ],
        },
        from: '39b7f597-dfd1-4dff-86f5-fe1b79cb70a0',
        time: '2018-07-12T09:43:34.442Z',
        type: 'conversation.member-join',
      };

      const account = new Account();
      const incomingEvent = account.mapConversationEvent(event);

      expect(incomingEvent.content).toBe(event.data);
      expect(incomingEvent.conversation).toBe(event.conversation);
      expect(incomingEvent.from).toBe(event.from);
      expect(typeof incomingEvent.id).toBe('string');
      expect(incomingEvent.messageTimer).toBe(0);
      expect(incomingEvent.state).toBe(PayloadBundleState.INCOMING);
      expect(incomingEvent.timestamp).toBe(new Date(event.time).getTime());
      expect(incomingEvent.type).toBe(PayloadBundleType.MEMBER_JOIN);
    });

    it('maps "conversation.rename" events', () => {
      const event = {
        conversation: 'ed5e4cd5-85ab-4d9e-be59-4e1c0324a9d4',
        data: {
          name: 'Tiny Timed Messages',
        },
        from: '39b7f597-dfd1-4dff-86f5-fe1b79cb70a0',
        time: '2018-08-01T12:01:21.629Z',
        type: 'conversation.rename',
      };

      const account = new Account();
      const incomingEvent = account.mapConversationEvent(event);

      expect(incomingEvent.content).toBe(event.data);
      expect(incomingEvent.conversation).toBe(event.conversation);
      expect(incomingEvent.from).toBe(event.from);
      expect(typeof incomingEvent.id).toBe('string');
      expect(incomingEvent.messageTimer).toBe(0);
      expect(incomingEvent.state).toBe(PayloadBundleState.INCOMING);
      expect(incomingEvent.timestamp).toBe(new Date(event.time).getTime());
      expect(incomingEvent.type).toBe(PayloadBundleType.CONVERSATION_RENAME);
    });

    it('maps "conversation.typing" events', () => {
      const event = {
        conversation: '508f14b9-ef4c-405d-bba9-5c4300cc1cbf',
        data: {status: 'started'},
        from: '16d71f22-0f7b-425e-b4b3-5e288700ac1f',
        time: '2018-08-01T12:10:42.422Z',
        type: 'conversation.typing',
      };

      const account = new Account();
      const incomingEvent = account.mapConversationEvent(event);

      expect(incomingEvent.content).toBe(event.data);
      expect(incomingEvent.conversation).toBe(event.conversation);
      expect(incomingEvent.from).toBe(event.from);
      expect(typeof incomingEvent.id).toBe('string');
      expect(incomingEvent.messageTimer).toBe(0);
      expect(incomingEvent.state).toBe(PayloadBundleState.INCOMING);
      expect(incomingEvent.timestamp).toBe(new Date(event.time).getTime());
      expect(incomingEvent.type).toBe(PayloadBundleType.TYPING);
    });
  });

  describe('"mapUserEvent"', () => {
    it('maps "user.connection" events', () => {
      const event = {
        connection: {
          conversation: '19dbbc18-5e22-41dc-acce-0d9d983c1a60',
          from: '39b7f597-dfd1-4dff-86f5-fe1b79cb70a0',
          last_update: '2018-07-06T09:38:52.286Z',
          message: ' ',
          status: 'sent',
          to: 'e023c681-7e51-43dd-a5d8-0f821e70a9c0',
        },
        type: 'user.connection',
      };

      const account = new Account();
      const incomingEvent = account.mapUserEvent(event);

      expect(incomingEvent.content).toBe(event.connection);
      expect(incomingEvent.conversation).toBe(event.connection.conversation);
      expect(incomingEvent.from).toBe(event.connection.from);
      expect(typeof incomingEvent.id).toBe('string');
      expect(incomingEvent.messageTimer).toBe(0);
      expect(incomingEvent.state).toBe(PayloadBundleState.INCOMING);
      expect(incomingEvent.timestamp).toBe(new Date(event.connection.last_update).getTime());
      expect(incomingEvent.type).toBe(PayloadBundleType.CONNECTION_REQUEST);
    });
  });

  describe('"login"', () => {
    it('logs in with correct credentials', async () => {
      const storeEngine = new MemoryEngine();
      await storeEngine.init('account.test');

      const apiClient = new APIClient({store: storeEngine, urls: MOCK_BACKEND});
      const account = new Account(apiClient);

      await account.init();
      const {clientId, clientType, userId} = await account.login({
        clientType: ClientType.TEMPORARY,
        email: 'hello@example.com',
        password: 'my-secret',
      });

      expect(clientId).toBe(CLIENT_ID);
      expect(ValidationUtil.isUUIDv4(userId)).toBe(true);
      expect(clientType).toBe(ClientType.TEMPORARY);
    });

    it('does not log in with incorrect credentials', async () => {
      const storeEngine = new MemoryEngine();
      await storeEngine.init('account.test');

      const apiClient = new APIClient({store: storeEngine, urls: MOCK_BACKEND});
      const account = new Account(apiClient);

      await account.init();

      try {
        await account.login({
          clientType: ClientType.TEMPORARY,
          email: 'hello@example.com',
          password: 'wrong',
        });

        fail('Should not be logged in');
      } catch (error) {
        expect(error.code).toBe(StatusCode.FORBIDDEN);
        expect(error.label).toBe(BackendErrorLabel.INVALID_CREDENTIALS);
      }
    });
  });

  describe('handleEvent', () => {
    it('propagates errors to the outer calling function', async done => {
      const storeEngine = new MemoryEngine();
      await storeEngine.init('account.test');

      const apiClient = new APIClient({store: storeEngine, urls: MOCK_BACKEND});
      const mockSocketServer = new MockSocketServer(MOCK_BACKEND.rest, {});

      const account = new Account(apiClient);
      spyOn(account, 'handleEvent').and.throwError('Test error');
      spyOn(account.apiClient.transport.ws, 'connect').and.returnValue(Promise.resolve(mockSocketServer));

      await account.init();

      await account.login({
        clientType: ClientType.TEMPORARY,
        email: 'hello@example.com',
        password: 'my-secret',
      });

      await account.listen();

      account.on('error', error => {
        expect(error.message).toBe('Test error');
        done();
      });

      const notification = {
        payload: [{}],
      };

      account.apiClient.transport.ws.emit(WebSocketTopic.ON_MESSAGE, notification);
    });
  });
});
