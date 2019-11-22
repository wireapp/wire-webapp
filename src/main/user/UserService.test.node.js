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
const {UserAPI} = require('@wireapp/api-client/dist/user/');
const {MemberAPI} = require('@wireapp/api-client/dist/team/member/');
const {TeamAPI} = require('@wireapp/api-client/dist/team/team/');
const {BroadcastAPI} = require('@wireapp/api-client/dist/broadcast/');
const {StatusCode} = require('@wireapp/api-client/dist/http/');
const {Backend} = require('@wireapp/api-client/dist/env/');
const {Permissions} = require('@wireapp/api-client/dist/team/member/');

const PayloadHelper = require('../test/PayloadHelper');

describe('UserService', () => {
  let hasState;

  afterAll(() => nock.cleanAll());

  beforeAll(() => {
    nock(Backend.PRODUCTION.rest)
      .get(UserAPI.URL.USERS)
      .query(() => true)
      .reply(uri => {
        const ids = PayloadHelper.getUrlParameter(uri, 'ids');

        const userPayloads = ids.split(',').map(requestedUserId => {
          return PayloadHelper.mockUserPayload(requestedUserId);
        });

        return [StatusCode.OK, JSON.stringify(userPayloads)];
      })
      .persist();

    nock(Backend.PRODUCTION.rest)
      .post(BroadcastAPI.URL.BROADCAST, requestBody => {
        hasState[requestBody.sender] = true;
        return true;
      })
      .query(() => true)
      .reply((uri, requestBody) => {
        const userClients = {};
        const requestedRecipients = requestBody.recipients;

        for (const recipient in requestedRecipients) {
          userClients[recipient] = [];
          for (const device in requestedRecipients[recipient]) {
            userClients[recipient].push(device);
          }
        }

        return [StatusCode.OK, JSON.stringify(userClients)];
      })
      .persist();

    nock(Backend.PRODUCTION.rest)
      .get(new RegExp(`${TeamAPI.URL.TEAMS}/.*/${MemberAPI.URL.MEMBERS}`))
      .query(() => true)
      .reply(() => {
        const data = {
          members: [
            {
              permissions: {
                copy: Permissions.DELETE_TEAM | Permissions.GET_BILLING | Permissions.SET_BILLING,
                self: Permissions.DELETE_TEAM | Permissions.GET_BILLING | Permissions.SET_BILLING,
              },
              user: PayloadHelper.getUUID(),
            },
          ],
        };

        return [StatusCode.OK, JSON.stringify(data)];
      })
      .persist();

    nock(Backend.PRODUCTION.rest)
      .get(new RegExp(`${UserAPI.URL.USERS}/.*/${UserAPI.URL.PRE_KEYS}`))
      .query(() => true)
      .reply(uri => {
        const requestedUserId = uri.replace(`${UserAPI.URL.USERS}/`, '').replace(`/${UserAPI.URL.PRE_KEYS}`, '');

        const data = {
          clients: [
            {
              client: PayloadHelper.getUUID(),
              prekey: {},
            },
          ],
          user: requestedUserId,
        };

        return [StatusCode.OK, JSON.stringify(data)];
      })
      .persist();
  });

  beforeEach(() => (hasState = {}));

  describe('getUsers', () => {
    it('fetches users', async () => {
      const userIds = [PayloadHelper.getUUID(), PayloadHelper.getUUID()];
      const account = new Account();
      await account.init();
      const users = await account.service.user.getUsers(userIds);
      expect(users.length).toBe(userIds.length);
    });
  });

  describe('setAvailability', () => {
    it('sets the availability', async () => {
      const teamId = PayloadHelper.getUUID();
      const account = new Account();
      await account.init();
      const clientId = PayloadHelper.getUUID();

      account.service.conversation.setClientID(clientId);
      expect(hasState[clientId]).toBeUndefined();

      await account.service.user.setAvailability(teamId, 1);
      expect(hasState[clientId]).toBe(true);
    });
  });
});
