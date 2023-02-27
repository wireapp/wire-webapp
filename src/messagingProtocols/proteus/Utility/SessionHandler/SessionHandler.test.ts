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

import type {UserClients} from '@wireapp/api-client/lib/conversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {APIClient} from '@wireapp/api-client';

import {constructSessionId, initSession, initSessions} from './SessionHandler';

import {CryptoClient} from '../../ProteusService/CryptoClient';

function generatePrekeys(userId: QualifiedId, clientIds: string[]) {
  const clients = clientIds.reduce((prekeys, clientId, index) => {
    return {
      ...prekeys,
      [clientId]: {
        id: index,
        key: 'pQABARn//wKhAFggJ1Fbpg5l6wnzKOJE+vXpRnkqUYhIvVnR5lNXEbO2o/0DoQChAFggHxZvgvtDktY/vqBcpjjo6rQnXvcNQhfwmy8AJQJKlD0E9g==',
      },
    };
  }, {});

  return {[userId.id]: clients};
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

  describe('constructSessionId', () => {
    describe('constructs a session ID', () => {
      it('without a domain', () => {
        const sessionId = constructSessionId({userId: 'user-id', clientId: 'client-id', useQualifiedIds: true});
        expect(sessionId).toBe('user-id@client-id');
      });

      it('with a domain', () => {
        const sessionId = constructSessionId({
          userId: 'user-id',
          clientId: 'client-id',
          domain: 'domain',
          useQualifiedIds: true,
        });
        expect(sessionId).toBe('domain@user-id@client-id');
      });

      it('with a domain and useQualifiedIds', () => {
        const sessionId = constructSessionId({
          userId: 'user-id',
          clientId: 'client-id',
          domain: 'domain',
          useQualifiedIds: true,
        });
        expect(sessionId).toBe('domain@user-id@client-id');
      });

      it('with a qualified ID', () => {
        const sessionId = constructSessionId({
          userId: {id: 'user-id', domain: 'domain'},
          clientId: 'client-id',
          useQualifiedIds: true,
        });
        expect(sessionId).toBe('domain@user-id@client-id');
      });

      it('with a qualified ID and useQualifiedIds', () => {
        const sessionId = constructSessionId({
          userId: {id: 'user-id', domain: 'domain'},
          clientId: 'client-id',
          useQualifiedIds: true,
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
      jest
        .spyOn(apiClient.api.user, 'postQualifiedMultiPreKeyBundles')
        .mockResolvedValue({domain: generatePrekeys(userId, [clientId])});

      const sessionId = constructSessionId({
        userId,
        clientId,
        useQualifiedIds: true,
      });
      await initSession({userId, clientId}, {apiClient, cryptoClient});

      expect(cryptoClient.sessionFromPrekey).toHaveBeenCalledWith(sessionId, expect.any(Object));
    });

    it('indicates the consumer if a session could not be created', async () => {
      const userId = {id: 'user1', domain: 'domain'};
      const clientId = 'client1';
      jest
        .spyOn(apiClient.api.user, 'postQualifiedMultiPreKeyBundles')
        .mockResolvedValue({domain: generatePrekeys(userId, [clientId])});

      const sessionId = constructSessionId({
        userId,
        clientId,
        useQualifiedIds: true,
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

      jest.spyOn(apiClient.api.user, 'postQualifiedMultiPreKeyBundles').mockResolvedValue({});
      jest.spyOn(apiClient.api.user, 'postMultiPreKeyBundles').mockResolvedValue({
        ...generatePrekeys({id: 'missing-user1', domain: ''}, ['client1']),
        ...generatePrekeys({id: 'missing-user2', domain: ''}, ['client1', 'client2']),
      });
      jest
        .spyOn(cryptoClient, 'sessionExists')
        .mockImplementation(sessionId => Promise.resolve(sessionId.includes('missing') as any));

      const sessionFromPrekeySpy = jest.spyOn(cryptoClient, 'sessionFromPrekey');
      const {sessions} = await initSessions({
        recipients: {...existingUserClients, ...missingUserClients},
        apiClient,
        cryptoClient,
      });

      expect(sessionFromPrekeySpy).toHaveBeenCalledTimes(3);
      expect(sessions).toHaveLength(6);
    });

    it('returns the list of deleted clients (clients with null prekeys)', async () => {
      const userClients: UserClients = {
        'existing-user1': ['client1', 'deleteclient'],
      };

      const allKeys = generatePrekeys({id: 'existing-user1', domain: ''}, ['client1']) as any;
      allKeys['existing-user1']['deleteclient'] = null;
      jest.spyOn(apiClient.api.user, 'postMultiPreKeyBundles').mockResolvedValue(allKeys);

      const {sessions, unknowns} = await initSessions({
        recipients: userClients,
        apiClient,
        cryptoClient,
      });

      expect(sessions).toEqual(['existing-user1@client1']);
      expect(unknowns).toEqual({'existing-user1': ['deleteclient']});
    });
  });
});
