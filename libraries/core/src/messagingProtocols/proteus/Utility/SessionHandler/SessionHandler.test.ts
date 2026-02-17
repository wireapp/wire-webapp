/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import type {QualifiedUserClients, UserClients} from '@wireapp/api-client/lib/conversation';
import {QualifiedId, QualifiedUserPreKeyBundleMap} from '@wireapp/api-client/lib/user';

import {APIClient} from '@wireapp/api-client';

import {constructSessionId, initSession, initSessions} from './SessionHandler';

import {CryptoClient} from '../../ProteusService/CryptoClient';

function generatePrekeys(recipients: QualifiedUserClients) {
  const prekeys: QualifiedUserPreKeyBundleMap = {};
  const failed: QualifiedId[] = [];

  Object.entries(recipients).forEach(([domain, userClients]) => {
    Object.entries(userClients).forEach(([userId, clientIds]) => {
      if (domain.startsWith('offline:')) {
        failed.push({id: userId, domain});
        return;
      }
      const domainUsers = prekeys[domain] || {};
      domainUsers[userId] = clientIds.reduce((acc, clientId, index) => {
        const payload = clientId.startsWith('deleted:')
          ? null
          : {
              id: index,
              key: 'pQABARn//wKhAFggJ1Fbpg5l6wnzKOJE+vXpRnkqUYhIvVnR5lNXEbO2o/0DoQChAFggHxZvgvtDktY/vqBcpjjo6rQnXvcNQhfwmy8AJQJKlD0E9g==',
            };
        return {
          ...acc,
          [clientId]: payload,
        };
      }, {});
      prekeys[domain] = domainUsers;
    });
  });

  return Promise.resolve({qualified_user_client_prekeys: prekeys, failed_to_list: failed});
}

describe('SessionHandler', () => {
  const cryptoClient = {
    sessionFromMessage: jest.fn(),
    sessionFromPrekey: jest.fn(),
    sessionExists: jest.fn(),
    saveSession: jest.fn(),
    deleteSession: jest.fn(),
  } as unknown as CryptoClient;
  const apiClient = new APIClient({urls: APIClient.BACKEND.STAGING});

  beforeAll(() => {
    jest.spyOn(apiClient.api.user, 'postMultiPreKeyBundles').mockImplementation(generatePrekeys);
  });

  afterAll(() => {
    jest.clearAllTimers();
    apiClient.disconnect();
  });

  describe('constructSessionId', () => {
    describe('constructs a session ID', () => {
      it('without a domain', () => {
        const sessionId = constructSessionId({userId: {id: 'user-id', domain: ''}, clientId: 'client-id'});
        expect(sessionId).toBe('user-id@client-id');
      });

      it('with a domain', () => {
        const sessionId = constructSessionId({
          userId: {id: 'user-id', domain: 'domain'},
          clientId: 'client-id',
        });
        expect(sessionId).toBe('domain@user-id@client-id');
      });

      it('with a qualified ID', () => {
        const sessionId = constructSessionId({
          userId: {id: 'user-id', domain: 'domain'},
          clientId: 'client-id',
        });
        expect(sessionId).toBe('domain@user-id@client-id');
      });
    });
  });

  describe('initSession', () => {
    it('only returns sessions that already exists', async () => {
      jest.spyOn(cryptoClient, 'sessionExists').mockResolvedValue(true);

      await initSession({userId: {id: 'user1', domain: 'domain'}, clientId: 'client1'}, {apiClient, cryptoClient});

      expect(cryptoClient.sessionFromPrekey).not.toHaveBeenCalled();
    });

    it('creates the session if it does not already exist', async () => {
      const userId = {id: 'user1', domain: 'domain'};
      const clientId = 'client1';
      jest.spyOn(cryptoClient, 'sessionExists').mockResolvedValue(false);

      const sessionId = constructSessionId({
        userId,
        clientId,
      });
      await initSession({userId, clientId}, {apiClient, cryptoClient});

      expect(cryptoClient.sessionFromPrekey).toHaveBeenCalledWith(sessionId, expect.any(Object));
    });
  });

  describe('initSessions', () => {
    it('creates new sessions only for sessions that are missing', async () => {
      const existingUserClients: UserClients = {
        'existing-user1': ['client1'],
        'existing-user2': ['client1', 'client2'],
      };

      const missingUserClients: UserClients = {
        'missing-user1': ['client1'],
        'missing-user2': ['client1', 'client2'],
      };

      jest
        .spyOn(cryptoClient, 'sessionExists')
        .mockImplementation(sessionId => Promise.resolve(sessionId.includes('missing') as any));

      const sessionFromPrekeySpy = jest.spyOn(cryptoClient, 'sessionFromPrekey');
      const {sessions} = await initSessions({
        recipients: {domain: {...existingUserClients, ...missingUserClients}},
        apiClient,
        cryptoClient,
      });

      expect(sessionFromPrekeySpy).toHaveBeenCalledTimes(3);
      expect(sessions).toHaveLength(6);
    });

    it('returns the list of deleted clients (clients with null prekeys)', async () => {
      const userClients: UserClients = {
        'existing-user1': ['client1', 'deleted:client2'],
      };

      const {sessions, unknowns} = await initSessions({
        recipients: {domain: userClients},
        apiClient,
        cryptoClient,
      });

      expect(sessions).toEqual(['domain@existing-user1@client1']);
      expect(unknowns).toEqual({domain: {'existing-user1': ['deleted:client2']}});
    });

    it('initializes sessions across multiple domains', async () => {
      const userClients: QualifiedUserClients = {
        domain1: {'existing-user1': ['client11']},
        domain2: {'existing-user2': ['client21']},
      };

      jest.spyOn(cryptoClient, 'sessionExists').mockResolvedValue(true);

      const {sessions, unknowns} = await initSessions({
        recipients: userClients,
        apiClient,
        cryptoClient,
      });

      expect(sessions).toEqual(['domain1@existing-user1@client11', 'domain2@existing-user2@client21']);
      expect(unknowns).toBeUndefined();
    });

    it('returns failed session creation', async () => {
      const recipients: QualifiedUserClients = {
        domain1: {'existing-user1': ['client1']},
        'offline:domain': {user2: ['client12']},
      };
      jest.spyOn(cryptoClient, 'sessionExists').mockResolvedValue(false);

      const {sessions, failed} = await initSessions({
        recipients,
        apiClient,
        cryptoClient,
      });

      expect(sessions).toEqual(['domain1@existing-user1@client1']);
      expect(failed).toEqual([{id: 'user2', domain: 'offline:domain'}]);
    });
  });
});
