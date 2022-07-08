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

import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {APIClient} from '@wireapp/api-client';
import {AuthAPI} from '@wireapp/api-client/src/auth';
import {ClientAPI, ClientType, RegisteredClient} from '@wireapp/api-client/src/client';
import {Self, SelfAPI} from '@wireapp/api-client/src/self';
import {ConversationAPI} from '@wireapp/api-client/src/conversation';
import {BackendError, BackendErrorLabel} from '@wireapp/api-client/src/http';
import {NotificationAPI} from '@wireapp/api-client/src/notification';
import {AccentColor, ValidationUtil} from '@wireapp/commons';
import {GenericMessage, Text} from '@wireapp/protocol-messaging';
import * as Proteus from '@wireapp/proteus';
import nock = require('nock');
import {Account} from './Account';
import {PayloadBundleType} from './conversation';
import {MessageBuilder} from './conversation/message/MessageBuilder';
import {WebSocketClient} from '@wireapp/api-client/src/tcp';

const BASE_URL = 'mock-backend.wire.com';
const MOCK_BACKEND = {
  name: 'mock',
  rest: `https://${BASE_URL}`,
  ws: `wss://${BASE_URL}`,
};

async function createAccount(storageName = `test-${Date.now()}`): Promise<Account> {
  const apiClient = new APIClient({urls: MOCK_BACKEND});
  const account = new Account(apiClient);
  await account.initServices({
    clientType: ClientType.TEMPORARY,
    userId: '',
  });
  return account;
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

  beforeAll(async () => {
    jasmine.clock().install();
    await Proteus.init();
  });
  afterAll(() => {
    jasmine.clock().uninstall();
  });

  beforeEach(() => {
    nock(MOCK_BACKEND.rest)
      .post(AuthAPI.URL.LOGIN, body => body.email && body.password)
      .query(() => true)
      .reply((uri, body: any) => {
        if (body.password === 'wrong') {
          return [
            HTTP_STATUS.FORBIDDEN,
            JSON.stringify({
              code: HTTP_STATUS.FORBIDDEN,
              label: 'invalid-credentials',
              message: 'Authentication failed.',
            }),
          ];
        }
        return [HTTP_STATUS.OK, JSON.stringify(accessTokenData)];
      });

    nock(MOCK_BACKEND.rest).post(`${AuthAPI.URL.ACCESS}/${AuthAPI.URL.LOGOUT}`).reply(HTTP_STATUS.OK, undefined);

    nock(MOCK_BACKEND.rest).post(AuthAPI.URL.ACCESS).reply(HTTP_STATUS.OK, accessTokenData);

    nock(MOCK_BACKEND.rest).post(ClientAPI.URL.CLIENTS).reply(HTTP_STATUS.OK, {id: CLIENT_ID});

    nock(MOCK_BACKEND.rest)
      .post(
        new RegExp(
          `${ConversationAPI.URL.CONVERSATIONS}/.*/${ConversationAPI.URL.OTR}/${ConversationAPI.URL.MESSAGES}`,
        ),
      )
      .query({ignore_missing: false})
      .reply(HTTP_STATUS.OK)
      .persist();

    nock(MOCK_BACKEND.rest)
      .get(`${NotificationAPI.URL.NOTIFICATION}/${NotificationAPI.URL.LAST}`)
      .query({client: CLIENT_ID})
      .reply(HTTP_STATUS.OK, {});

    nock(MOCK_BACKEND.rest)
      .get(NotificationAPI.URL.NOTIFICATION)
      .query({client: CLIENT_ID, size: 10000})
      .reply(HTTP_STATUS.OK, {has_more: false, notifications: []})
      .persist();

    nock(MOCK_BACKEND.rest)
      .get(ClientAPI.URL.CLIENTS)
      .reply(HTTP_STATUS.OK, [{id: CLIENT_ID}] as RegisteredClient[]);

    nock(MOCK_BACKEND.rest)
      .get(SelfAPI.URL.SELF)
      .reply(HTTP_STATUS.OK, {
        email: 'email@example.com',
        handle: 'exampleuser',
        locale: 'en',
        qualified_id: {
          domain: 'example.com',
          id: '024174ec-c098-4104-9424-3849804acb78',
        },
        accent_id: AccentColor.AccentColorID.BRIGHT_ORANGE,
        picture: [],
        name: 'Example User',
        id: '024174ec-c098-4104-9424-3849804acb78',
        assets: [],
      } as Self);
  });

  describe('"createText"', () => {
    it('creates a text payload', async () => {
      const date = new Date(Date.UTC(2017, 0, 1, 0, 0, 0));
      jasmine.clock().mockDate(date);

      const account = await createAccount();

      await account.login({
        clientType: ClientType.TEMPORARY,
        email: 'hello@example.com',
        password: 'my-secret',
      });

      expect(account['apiClient'].context!.userId).toBeDefined();

      const text = 'FIFA World Cup';
      const payload = MessageBuilder.createText({conversationId: '', from: '', text}).build();

      expect(payload.timestamp).toEqual(date.getTime());
    });
  });

  describe('"init"', () => {
    it('initializes the Protocol buffers', async () => {
      const account = new Account();

      await account.initServices({clientType: ClientType.TEMPORARY, userId: ''});

      expect(account.service!.conversation).toBeDefined();
      expect(account.service!.cryptography).toBeDefined();

      const message = GenericMessage.create({
        messageId: '2d7cb6d8-118f-11e8-b642-0ed5f89f718b',
        text: Text.create({content: 'Hello, World!'}),
      });

      expect(message.content).toBe('text');
    });
  });

  describe('"login"', () => {
    it('logs in with correct credentials', async () => {
      const apiClient = new APIClient({urls: MOCK_BACKEND});
      const account = new Account(apiClient);

      await account.initServices({clientType: ClientType.TEMPORARY, userId: ''});
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
      const apiClient = new APIClient({urls: MOCK_BACKEND});
      const account = new Account(apiClient);

      await account.initServices({clientType: ClientType.TEMPORARY, userId: ''});

      try {
        await account.login({
          clientType: ClientType.TEMPORARY,
          email: 'hello@example.com',
          password: 'wrong',
        });

        fail('Should not be logged in');
      } catch (error) {
        const backendError = error as BackendError;
        expect(backendError.code).toBe(HTTP_STATUS.FORBIDDEN);
        expect(backendError.label).toBe(BackendErrorLabel.INVALID_CREDENTIALS);
      }
    });
  });

  it('emits text messages', async done => {
    const account = await createAccount();

    await account.login({
      clientType: ClientType.TEMPORARY,
      email: 'hello@example.com',
      password: 'my-secret',
    });

    await account.listen();

    spyOn<any>(account.service!.notification, 'handleEvent').and.returnValue({
      mappedEvent: {type: PayloadBundleType.TEXT},
    });
    account.on(PayloadBundleType.TEXT, message => {
      expect(message.type).toBe(PayloadBundleType.TEXT);
      done();
    });

    account.service!.notification['apiClient'].transport.ws.emit(WebSocketClient.TOPIC.ON_MESSAGE, {payload: [{}]});
  });
});
