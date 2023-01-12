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

/* eslint-disable import/order */
import * as Recipients from '../Utility/Recipients';

import {ConversationProtocol, QualifiedUserClients, UserClients} from '@wireapp/api-client/lib/conversation';

import {MessageTargetMode} from '../../../conversation';
import {buildTextMessage} from '../../../conversation/message/MessageBuilder';
import {SendProteusMessageParams} from './ProteusService.types';
import {QualifiedUserPreKeyBundleMap, UserPreKeyBundleMap} from '@wireapp/api-client/lib/user';
import {buildProteusService} from './ProteusService.mocks';
import {constructSessionId} from '../Utility/SessionHandler';
import {NotificationSource} from '../../../notification';
import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event';
import {GenericMessage} from '@wireapp/protocol-messaging';

jest.mock('./CryptoClient/PrekeysTracker', () => {
  return {
    PrekeyTracker: jest.fn().mockImplementation(() => {
      return {
        consumePrekey: jest.fn(),
        getNumberOfPrekeys: jest.fn().mockResolvedValue(0),
        generateInitialPrekeys: jest.fn().mockResolvedValue({prekeys: [1, 2, 3], lastPrekey: [65000]}),
      };
    }),
  };
});

jest.mock('../Utility/Recipients', () => ({
  ...jest.requireActual('../Utility/Recipients'),
  getRecipientsForConversation: jest.fn(),
  getQualifiedRecipientsForConversation: jest.fn(),
}));
const MockedRecipients = Recipients as jest.Mocked<typeof Recipients>;

const prepareDataForEncryption = async (useQualifiedIds: boolean = true) => {
  const [proteusService, {coreCrypto, apiClient}] = await buildProteusService(useQualifiedIds);

  const domain = 'staging.zinfra.io';
  //user 1
  const firstUserId = 'bc0c99f1-49a5-4ad2-889a-62885af37088';
  //user 1 clients
  const firstClientId = 'be67218b77d02d30';
  const secondClientId = 'ae87218e77d02d30';
  //user 1 sessions
  const firstClientSessionId = constructSessionId({
    userId: firstUserId,
    clientId: firstClientId,
    useQualifiedIds,
    domain: useQualifiedIds ? domain : undefined,
  });
  const firstClientSession2Id = constructSessionId({
    userId: firstUserId,
    clientId: secondClientId,
    useQualifiedIds,
    domain: useQualifiedIds ? domain : undefined,
  });

  //user 2
  const secondUserId = 'cd0c88f1-49a5-4ar2-889a-62885af37069';
  //user 2 client
  const thirdClientId = 'be67218b77d02d69';
  //user 2 sessions
  const secondClientSessionId = constructSessionId({
    userId: secondUserId,
    clientId: thirdClientId,
    useQualifiedIds,
    domain: useQualifiedIds ? domain : undefined,
  });

  //message sent by a user
  const message = 'Hello';
  //buffer of the message
  const messageBuffer = new Uint8Array(Buffer.from(message, 'utf8'));

  //mocked payload encrypted and returned by corecrypto
  const encryptedMessageBuffer = messageBuffer.reverse();

  const validPreKey = {
    id: 1337,
    key: 'pQABARn//wKhAFggJ1Fbpg5l6wnzKOJE+vXpRnkqUYhIvVnR5lNXEbO2o/0DoQChAFggHxZvgvtDktY/vqBcpjjo6rQnXvcNQhfwmy8AJQJKlD0E9g==',
  };

  return {
    services: {proteusService, apiClient, coreCryptoClient: coreCrypto},
    data: {
      firstUser: {
        id: firstUserId,
        clients: {first: firstClientId, second: secondClientId},
        sessions: {first: firstClientSessionId, second: firstClientSession2Id},
      },
      secondUser: {
        id: secondUserId,
        clients: {first: thirdClientId},
        sessions: {first: secondClientSessionId},
      },
      message,
      messageBuffer,
      encryptedMessageBuffer,
      validPreKey,
      domain,
    },
  };
};

describe('ProteusService', () => {
  describe('getRemoteFingerprint', () => {
    it('create a session if session does not exists', async () => {
      const [proteusService, {apiClient, coreCrypto}] = await buildProteusService();
      const expectedFingerprint = 'fingerprint-client1';

      const getPrekeyMock = jest.spyOn(apiClient.api.user, 'getClientPreKey').mockResolvedValue({
        client: 'client1',
        prekey: {
          id: 123,
          key: 'pQABARhIAqEAWCCaJpFa9c626ORmjj1aV6OnOYgmTjfoiE3ynOfNfGAOmgOhAKEAWCD60VMzRrLfO+1GSjgyhnVp2N7L58DM+eeJhZJi1tBLfQT2',
        },
      });
      jest.spyOn(coreCrypto, 'proteusFingerprintRemote').mockResolvedValue(expectedFingerprint);
      jest.spyOn(coreCrypto as any, 'proteusSessionExists').mockResolvedValue(false);

      const userId = {id: 'user1', domain: 'domain.com'};
      const clientId = 'client1';

      const result = await proteusService.getRemoteFingerprint(userId, clientId);

      expect(getPrekeyMock).toHaveBeenCalledWith(userId, clientId);
      expect(result).toBe(expectedFingerprint);
    });

    it('create a session from given prekey if session does not exists', async () => {
      const [proteusService, {apiClient, coreCrypto}] = await buildProteusService();
      const expectedFingerprint = 'fingerprint-client1';

      const getPrekeyMock = jest.spyOn(apiClient.api.user, 'getClientPreKey');
      jest.spyOn(coreCrypto, 'proteusFingerprintRemote').mockResolvedValue(expectedFingerprint);
      jest.spyOn(coreCrypto as any, 'proteusSessionExists').mockResolvedValue(false);

      const userId = {id: 'user1', domain: 'domain.com'};
      const clientId = 'client1';

      const result = await proteusService.getRemoteFingerprint(userId, clientId, {
        key: 'pQABARhIAqEAWCCaJpFa9c626ORmjj1aV6OnOYgmTjfoiE3ynOfNfGAOmgOhAKEAWCD60VMzRrLfO+1GSjgyhnVp2N7L58DM+eeJhZJi1tBLfQT2',
        id: 123,
      });

      expect(getPrekeyMock).not.toHaveBeenCalled();
      expect(result).toBe(expectedFingerprint);
    });

    it('returns the fingerprint from existing session', async () => {
      const [proteusService, {apiClient, coreCrypto}] = await buildProteusService();
      const expectedFingerprint = 'fingerprint-client1';

      const getPrekeyMock = jest.spyOn(apiClient.api.user, 'getClientPreKey');
      const sessionFromPrekeyMock = jest.spyOn(coreCrypto, 'proteusSessionFromPrekey');
      jest.spyOn(coreCrypto, 'proteusFingerprintRemote').mockResolvedValue(expectedFingerprint);
      jest.spyOn(coreCrypto as any, 'proteusSessionExists').mockResolvedValue(true);

      const userId = {id: 'user1', domain: 'domain.com'};
      const clientId = 'client1';

      const result = await proteusService.getRemoteFingerprint(userId, clientId);

      expect(getPrekeyMock).not.toHaveBeenCalled();
      expect(sessionFromPrekeyMock).not.toHaveBeenCalled();
      expect(result).toBe(expectedFingerprint);
    });
  });

  describe('handleEvent', () => {
    const eventPayload = {
      event: {
        type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
        qualified_from: {id: 'user1', domain: 'domain'},
        data: {sender: 'client1', text: ''},
      },
      source: NotificationSource.WEBSOCKET,
    } as any;
    const decryptedMessage = {} as any;
    it('decrypts incoming proteus encrypted events when session already exists', async () => {
      const [proteusService, {coreCrypto}] = await buildProteusService();
      jest.spyOn(coreCrypto, 'proteusSessionExists').mockResolvedValue(true as any);
      const createSessionSpy = jest.spyOn(coreCrypto, 'proteusSessionFromMessage');
      jest.spyOn(GenericMessage, 'decode').mockReturnValue(decryptedMessage);
      const result = await proteusService.handleEvent(eventPayload);
      expect(result).toBeDefined();
      expect(createSessionSpy).not.toHaveBeenCalled();
      expect(result?.decryptedData).toBe(decryptedMessage);
    });

    it('decrypts incoming proteus encrypted and creates session if not already existing', async () => {
      const [proteusService, {coreCrypto}] = await buildProteusService();
      jest.spyOn(coreCrypto, 'proteusSessionExists').mockResolvedValue(false as any);
      const createSessionSpy = jest.spyOn(coreCrypto, 'proteusSessionFromMessage');
      const decryptSpy = jest.spyOn(coreCrypto, 'proteusDecrypt');
      jest.spyOn(GenericMessage, 'decode').mockReturnValue(decryptedMessage);
      const result = await proteusService.handleEvent(eventPayload);
      expect(result).toBeDefined();
      expect(createSessionSpy).toHaveBeenCalled();
      expect(decryptSpy).not.toHaveBeenCalled();
      expect(result?.decryptedData).toBe(decryptedMessage);
    });
  });

  describe('"encrypt"', () => {
    it('returns encrypted payload', async () => {
      const {
        services,
        data: {firstUser, validPreKey, encryptedMessageBuffer, messageBuffer},
      } = await prepareDataForEncryption(false);

      const userClients: UserClients = {
        [firstUser.id]: [firstUser.clients.first, firstUser.clients.second],
      };

      const preKeyBundleMap: UserPreKeyBundleMap = {
        [firstUser.id]: {
          [firstUser.clients.first]: validPreKey,
          [firstUser.clients.second]: validPreKey,
        },
      };

      const encryptedPayload = new Map([
        [firstUser.sessions.first, encryptedMessageBuffer],
        [firstUser.sessions.second, encryptedMessageBuffer],
      ]);

      jest
        .spyOn(services.apiClient.api.user, 'postMultiPreKeyBundles')
        .mockImplementationOnce(() => Promise.resolve(preKeyBundleMap));

      jest
        .spyOn(services.coreCryptoClient, 'proteusEncryptBatched')
        .mockImplementationOnce(() => Promise.resolve(encryptedPayload));

      const encrypted = await services.proteusService.encrypt(messageBuffer, userClients);

      expect(services.coreCryptoClient.proteusEncryptBatched).toHaveBeenCalledWith(
        [firstUser.sessions.first, firstUser.sessions.second],
        messageBuffer,
      );

      expect(encrypted).toEqual({
        [firstUser.id]: {
          [firstUser.clients.first]: encryptedMessageBuffer,
          [firstUser.clients.second]: encryptedMessageBuffer,
        },
      });
    });

    it('returns encrypted payload for multiple users', async () => {
      const {
        services,
        data: {firstUser, secondUser, validPreKey, encryptedMessageBuffer, messageBuffer},
      } = await prepareDataForEncryption(false);

      const userClients: UserClients = {
        [firstUser.id]: [firstUser.clients.first, firstUser.clients.second],
        [secondUser.id]: [secondUser.clients.first],
      };

      const preKeyBundleMap: UserPreKeyBundleMap = {
        [firstUser.id]: {
          [firstUser.clients.first]: validPreKey,
          [firstUser.clients.second]: null,
        },
        [secondUser.id]: {
          [secondUser.clients.first]: validPreKey,
        },
      };

      const encryptedPayload = new Map([
        [firstUser.sessions.first, encryptedMessageBuffer],
        [firstUser.sessions.second, encryptedMessageBuffer],
        [secondUser.sessions.first, encryptedMessageBuffer],
      ]);

      jest
        .spyOn(services.apiClient.api.user, 'postMultiPreKeyBundles')
        .mockImplementationOnce(() => Promise.resolve(preKeyBundleMap));
      jest
        .spyOn(services.coreCryptoClient, 'proteusEncryptBatched')
        .mockImplementationOnce(() => Promise.resolve(encryptedPayload));

      const encrypted = await services.proteusService.encrypt(messageBuffer, userClients);

      expect(services.coreCryptoClient.proteusEncryptBatched).toHaveBeenCalledWith(
        [firstUser.sessions.first, secondUser.sessions.first],
        messageBuffer,
      );

      expect(encrypted).toEqual({
        [firstUser.id]: {
          [firstUser.clients.first]: encryptedMessageBuffer,
          [firstUser.clients.second]: encryptedMessageBuffer,
        },
        [secondUser.id]: {
          [secondUser.clients.first]: encryptedMessageBuffer,
        },
      });
    });
  });

  describe('"encryptQualified"', () => {
    it('returns encrypted payload', async () => {
      const {
        services,
        data: {firstUser, validPreKey, encryptedMessageBuffer, messageBuffer, domain},
      } = await prepareDataForEncryption();

      const userClients: QualifiedUserClients = {
        [domain]: {
          [firstUser.id]: [firstUser.clients.first, firstUser.clients.second],
        },
      };

      const preKeyBundleMap: QualifiedUserPreKeyBundleMap = {
        [domain]: {
          [firstUser.id]: {
            [firstUser.clients.first]: validPreKey,
            [firstUser.clients.second]: validPreKey,
          },
        },
      };

      const encryptedPayload = new Map([
        [firstUser.sessions.first, encryptedMessageBuffer],
        [firstUser.sessions.second, encryptedMessageBuffer],
      ]);

      jest
        .spyOn(services.apiClient.api.user, 'postQualifiedMultiPreKeyBundles')
        .mockImplementationOnce(() => Promise.resolve(preKeyBundleMap));

      jest
        .spyOn(services.coreCryptoClient, 'proteusEncryptBatched')
        .mockImplementationOnce(() => Promise.resolve(encryptedPayload));

      const encrypted = await services.proteusService.encryptQualified(messageBuffer, userClients);

      // console.log({encrypted, missing});

      expect(services.coreCryptoClient.proteusEncryptBatched).toHaveBeenCalledWith(
        [firstUser.sessions.first, firstUser.sessions.second],
        messageBuffer,
      );

      expect(encrypted).toEqual({
        [domain]: {
          [firstUser.id]: {
            [firstUser.clients.first]: encryptedMessageBuffer,
            [firstUser.clients.second]: encryptedMessageBuffer,
          },
        },
      });
    });

    it('returns missing clients and encrypted payload for multiple users', async () => {
      const {
        services,
        data: {firstUser, secondUser, validPreKey, encryptedMessageBuffer, messageBuffer, domain},
      } = await prepareDataForEncryption();

      const userClients: QualifiedUserClients = {
        [domain]: {
          [firstUser.id]: [firstUser.clients.first, firstUser.clients.second],
          [secondUser.id]: [secondUser.clients.first],
        },
      };

      const preKeyBundleMap: QualifiedUserPreKeyBundleMap = {
        [domain]: {
          [firstUser.id]: {
            [firstUser.clients.first]: validPreKey,
            [firstUser.clients.second]: null,
          },
          [secondUser.id]: {
            [secondUser.clients.first]: validPreKey,
          },
        },
      };

      const encryptedPayload = new Map([
        [firstUser.sessions.first, encryptedMessageBuffer],
        [secondUser.sessions.first, encryptedMessageBuffer],
      ]);

      jest
        .spyOn(services.apiClient.api.user, 'postQualifiedMultiPreKeyBundles')
        .mockImplementationOnce(() => Promise.resolve(preKeyBundleMap));
      jest
        .spyOn(services.coreCryptoClient, 'proteusEncryptBatched')
        .mockImplementationOnce(() => Promise.resolve(encryptedPayload));

      const encrypted = await services.proteusService.encryptQualified(messageBuffer, userClients);

      expect(services.coreCryptoClient.proteusEncryptBatched).toHaveBeenCalledWith(
        [firstUser.sessions.first, secondUser.sessions.first],
        messageBuffer,
      );

      expect(encrypted).toEqual({
        [domain]: {
          [firstUser.id]: {
            [firstUser.clients.first]: encryptedMessageBuffer,
          },
          [secondUser.id]: {
            [secondUser.clients.first]: encryptedMessageBuffer,
          },
        },
      });
    });
  });

  describe('sendGenericMessage', () => {
    describe('targetted messages', () => {
      const message = buildTextMessage({text: 'test'});
      // eslint-disable-next-line jest/no-done-callback

      it('fails if no userIds are given', async () => {
        const [proteusService] = await buildProteusService();

        let errorMessage;

        const params: SendProteusMessageParams = {
          conversationId: {id: 'conv1', domain: ''},
          payload: message,
          protocol: ConversationProtocol.PROTEUS,
          targetMode: MessageTargetMode.USERS,
        };

        try {
          await proteusService.sendMessage(params);
        } catch (error) {
          errorMessage = (error as {message: string}).message;
        } finally {
          expect(errorMessage).toContain('no userIds are given');
        }
      });

      [{user1: ['client1'], user2: ['client11', 'client12']}, ['user1', 'user2']].forEach(recipients => {
        it(`forwards the list of users to report (${JSON.stringify(recipients)})`, async () => {
          const [proteusService] = await buildProteusService();

          MockedRecipients.getRecipientsForConversation.mockResolvedValue({} as any);

          jest.spyOn(proteusService['messageService'], 'sendMessage').mockReturnValue(Promise.resolve({} as any));
          await proteusService.sendMessage({
            protocol: ConversationProtocol.PROTEUS,
            payload: message,
            targetMode: MessageTargetMode.USERS,
            userIds: recipients,
            conversationId: {id: 'conv1', domain: ''},
          });

          expect(proteusService['messageService'].sendMessage).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Object),
            expect.any(Uint8Array),
            expect.objectContaining({reportMissing: ['user1', 'user2']}),
          );
        });
      });

      [
        {domain1: {user1: ['client1'], user2: ['client11', 'client12']}, domain2: {user3: ['client1']}},
        [
          {id: 'user1', domain: 'domain1'},
          {id: 'user2', domain: 'domain1'},
          {id: 'user3', domain: 'domain2'},
        ],
      ].forEach(recipients => {
        it(`forwards the list of users to report for federated message (${JSON.stringify(recipients)})`, async () => {
          const [proteusService] = await buildProteusService(true);
          MockedRecipients.getQualifiedRecipientsForConversation.mockResolvedValue({} as any);
          jest.spyOn(proteusService['messageService'], 'sendFederatedMessage').mockResolvedValue({} as any);
          await proteusService.sendMessage({
            protocol: ConversationProtocol.PROTEUS,
            conversationId: {id: 'conv1', domain: 'domain1'},
            payload: message,
            targetMode: MessageTargetMode.USERS,
            userIds: recipients,
          });

          expect(proteusService['messageService'].sendFederatedMessage).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Object),
            expect.any(Uint8Array),
            expect.objectContaining({
              reportMissing: [
                {id: 'user1', domain: 'domain1'},
                {id: 'user2', domain: 'domain1'},
                {id: 'user3', domain: 'domain2'},
              ],
            }),
          );
        });
      });

      [{user1: ['client1'], user2: ['client11', 'client12']}, ['user1', 'user2']].forEach(recipients => {
        it(`ignores all missing user/client pair if targetMode is USER_CLIENTS`, async () => {
          const [proteusService] = await buildProteusService(false);
          MockedRecipients.getRecipientsForConversation.mockReturnValue(Promise.resolve({} as any));
          jest.spyOn(proteusService['messageService'], 'sendMessage').mockReturnValue(Promise.resolve({} as any));
          await proteusService.sendMessage({
            conversationId: {id: 'conv1', domain: ''},
            protocol: ConversationProtocol.PROTEUS,
            payload: message,
            targetMode: MessageTargetMode.USERS_CLIENTS,
            userIds: recipients,
          });

          expect(proteusService['messageService'].sendMessage).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Object),
            expect.any(Uint8Array),
            expect.objectContaining({reportMissing: false}),
          );
        });
      });

      [
        {domain1: {user1: ['client1'], user2: ['client11', 'client12']}, domain2: {user3: ['client1']}},
        [
          {id: 'user1', domain: 'domain1'},
          {id: 'user2', domain: 'domain1'},
          {id: 'user3', domain: 'domain2'},
        ],
      ].forEach(recipients => {
        it(`ignores all missing user/client pair if targetMode is USER_CLIENTS on federated env`, async () => {
          const [proteusService] = await buildProteusService(true);

          MockedRecipients.getQualifiedRecipientsForConversation.mockResolvedValue({} as any);
          jest
            .spyOn(proteusService['messageService'], 'sendFederatedMessage')
            .mockReturnValue(Promise.resolve({} as any));
          await proteusService.sendMessage({
            protocol: ConversationProtocol.PROTEUS,
            conversationId: {id: 'conv1', domain: 'domain1'},
            payload: message,
            targetMode: MessageTargetMode.USERS_CLIENTS,
            userIds: recipients,
          });

          expect(proteusService['messageService'].sendFederatedMessage).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Object),
            expect.any(Uint8Array),
            expect.objectContaining({
              reportMissing: false,
            }),
          );
        });
      });
    });
  });
});
