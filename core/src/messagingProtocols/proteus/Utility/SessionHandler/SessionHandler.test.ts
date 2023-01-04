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

import {constructSessionId, initSession, initSessions} from './SessionHandler';

import {buildProteusService} from '../../ProteusService/ProteusService.mocks';

describe('SessionHandler', () => {
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
      const {apiClient, coreCrypto} = (await buildProteusService())[1];
      jest.spyOn(coreCrypto as any, 'proteusSessionExists').mockResolvedValue(true);

      const sessionFromPrekeySpy = jest.spyOn(coreCrypto, 'proteusSessionFromPrekey');
      await initSession({userId: {id: 'user1', domain: 'domain'}, clientId: 'client1'}, {apiClient, coreCrypto});

      expect(sessionFromPrekeySpy).not.toHaveBeenCalled();
    });

    it('creates the session if it does not already exist', async () => {
      const {apiClient, coreCrypto} = (await buildProteusService())[1];
      jest.spyOn(coreCrypto as any, 'proteusSessionExists').mockResolvedValue(false);
      jest.spyOn(apiClient.api.user, 'getClientPreKey').mockResolvedValue({
        prekey: {
          id: 1,
          key: 'pQABARn//wKhAFggJ1Fbpg5l6wnzKOJE+vXpRnkqUYhIvVnR5lNXEbO2o/0DoQChAFggHxZvgvtDktY/vqBcpjjo6rQnXvcNQhfwmy8AJQJKlD0E9g==',
        },
        client: 'client1',
      });

      const sessionId = constructSessionId({
        userId: {id: 'user1', domain: 'domain'},
        clientId: 'client1',
        useQualifiedIds: true,
      });
      const sessionFromPrekeySpy = jest.spyOn(coreCrypto, 'proteusSessionFromPrekey');
      await initSession({userId: {id: 'user1', domain: 'domain'}, clientId: 'client1'}, {apiClient, coreCrypto});

      expect(sessionFromPrekeySpy).toHaveBeenCalledWith(sessionId, expect.any(Object));
    });
  });

  describe('initSessions', () => {
    it('creates new sessions only for sessions that are missing', async () => {
      const {apiClient, coreCrypto} = (await buildProteusService())[1];

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
        'missing-user1': {
          client1: {
            id: 1,
            key: 'pQABARn//wKhAFggJ1Fbpg5l6wnzKOJE+vXpRnkqUYhIvVnR5lNXEbO2o/0DoQChAFggHxZvgvtDktY/vqBcpjjo6rQnXvcNQhfwmy8AJQJKlD0E9g==',
          },
        },
        'missing-user2': {
          client1: {
            id: 1,
            key: 'pQABARn//wKhAFggJ1Fbpg5l6wnzKOJE+vXpRnkqUYhIvVnR5lNXEbO2o/0DoQChAFggHxZvgvtDktY/vqBcpjjo6rQnXvcNQhfwmy8AJQJKlD0E9g==',
          },
          client2: {
            id: 1,
            key: 'pQABARn//wKhAFggJ1Fbpg5l6wnzKOJE+vXpRnkqUYhIvVnR5lNXEbO2o/0DoQChAFggHxZvgvtDktY/vqBcpjjo6rQnXvcNQhfwmy8AJQJKlD0E9g==',
          },
        },
      });
      jest
        .spyOn(coreCrypto, 'proteusSessionExists')
        .mockImplementation(sessionId => Promise.resolve(sessionId.includes('missing') as any));

      const sessionFromPrekeySpy = jest.spyOn(coreCrypto, 'proteusSessionFromPrekey');
      const sessions = await initSessions({
        recipients: {...existingUserClients, ...missingUserClients},
        apiClient,
        coreCrypto,
      });

      expect(sessionFromPrekeySpy).toHaveBeenCalledTimes(3);
      expect(sessions).toHaveLength(6);
    });
  });
});
