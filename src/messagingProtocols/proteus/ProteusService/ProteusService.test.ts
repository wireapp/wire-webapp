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

import {
  CONVERSATION_CELLS_STATE,
  CONVERSATION_ACCESS_ROLE,
  CONVERSATION_TYPE,
  Conversation,
  ConversationProtocol,
  FederatedBackendsError,
  FederatedBackendsErrorLabel,
  QualifiedUserClients,
} from '@wireapp/api-client/lib/conversation';

import {AddUsersFailureReasons, MessageSendingState, MessageTargetMode} from '../../../conversation';
import {buildTextMessage} from '../../../conversation/message/MessageBuilder';
import {SendProteusMessageParams} from './ProteusService.types';
import {buildProteusService} from './ProteusService.mocks';
import {constructSessionId} from '../Utility/SessionHandler';
import {CONVERSATION_EVENT, ConversationOtrMessageAddEvent} from '@wireapp/api-client/lib/event';
import {GenericMessage} from '@wireapp/protocol-messaging';
import {ProteusService} from './ProteusService';
import {NonFederatingBackendsError} from '../../../errors';
import {generateQualifiedId, generateQualifiedIds} from '../../../testUtils';

jest.mock('./CryptoClient/CoreCryptoWrapper/PrekeysTracker', () => {
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

const prepareDataForEncryption = async () => {
  const [proteusService, {cryptoClient, apiClient}] = await buildProteusService();

  const domain = 'staging.zinfra.io';
  //user 1
  const firstUserId = {id: 'bc0c99f1-49a5-4ad2-889a-62885af37088', domain};
  //user 1 clients
  const firstClientId = 'be67218b77d02d30';
  const secondClientId = 'ae87218e77d02d30';
  //user 1 sessions
  const firstClientSessionId = constructSessionId({
    userId: firstUserId,
    clientId: firstClientId,
  });
  const firstClientSession2Id = constructSessionId({
    userId: firstUserId,
    clientId: secondClientId,
  });

  //user 2
  const secondUserId = {id: 'cd0c88f1-49a5-4ar2-889a-62885af37069', domain};
  //user 2 client
  const thirdClientId = 'ce67218b77d02d69';
  //user 2 sessions
  const secondClientSessionId = constructSessionId({
    userId: secondUserId,
    clientId: thirdClientId,
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
    services: {proteusService, apiClient, cryptoClient},
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
  const domain1 = 'domain1';
  const domain2 = 'domain2';
  const domain3 = 'domain3';

  const usersDomain1 = generateQualifiedIds(3, domain1);
  const usersDomain2 = generateQualifiedIds(3, domain2);
  const usersDomain3 = generateQualifiedIds(3, domain3);
  describe('getRemoteFingerprint', () => {
    it('create a session if session does not exists', async () => {
      const [proteusService, {apiClient, cryptoClient}] = await buildProteusService();
      const expectedFingerprint = 'fingerprint-client1';

      const userId = generateQualifiedId('domain');
      const clientId = 'client1';

      jest.spyOn(apiClient.api.user, 'postMultiPreKeyBundles').mockResolvedValue({
        qualified_user_client_prekeys: {
          [userId.domain]: {
            [userId.id]: {
              [clientId]: {
                id: 123,
                key: 'pQABARhIAqEAWCCaJpFa9c626ORmjj1aV6OnOYgmTjfoiE3ynOfNfGAOmgOhAKEAWCD60VMzRrLfO+1GSjgyhnVp2N7L58DM+eeJhZJi1tBLfQT2',
              },
            },
          },
        },
      });
      jest.spyOn(cryptoClient, 'getRemoteFingerprint').mockResolvedValue(expectedFingerprint);
      jest.spyOn(cryptoClient, 'sessionFromPrekey').mockResolvedValue(undefined);
      jest.spyOn(cryptoClient, 'saveSession').mockResolvedValue(undefined);
      jest.spyOn(cryptoClient, 'sessionExists').mockResolvedValue(false);

      const result = await proteusService.getRemoteFingerprint(userId, clientId);

      expect(result).toBe(expectedFingerprint);
    });

    it('create a session from given prekey if session does not exists', async () => {
      const [proteusService, {apiClient, cryptoClient}] = await buildProteusService();
      const expectedFingerprint = 'fingerprint-client1';

      const getPrekeysSpy = jest.spyOn(apiClient.api.user, 'postMultiPreKeyBundles');
      jest.spyOn(cryptoClient, 'getRemoteFingerprint').mockResolvedValue(expectedFingerprint);
      const saveSessionSpy = jest.spyOn(cryptoClient, 'sessionFromPrekey').mockResolvedValue(undefined);
      jest.spyOn(cryptoClient, 'saveSession').mockResolvedValue(undefined);
      jest.spyOn(cryptoClient, 'sessionExists').mockResolvedValue(false);

      const userId = generateQualifiedId('domain');
      const clientId = 'client1';

      const result = await proteusService.getRemoteFingerprint(userId, clientId, {
        key: 'pQABARhIAqEAWCCaJpFa9c626ORmjj1aV6OnOYgmTjfoiE3ynOfNfGAOmgOhAKEAWCD60VMzRrLfO+1GSjgyhnVp2N7L58DM+eeJhZJi1tBLfQT2',
        id: 123,
      });

      expect(saveSessionSpy).toHaveBeenCalled();
      expect(getPrekeysSpy).not.toHaveBeenCalled();
      expect(result).toBe(expectedFingerprint);
    });

    it('returns the fingerprint from existing session', async () => {
      const [proteusService, {apiClient, cryptoClient}] = await buildProteusService();
      const expectedFingerprint = 'fingerprint-client1';

      const getPrekeyMock = jest.spyOn(apiClient.api.user, 'getClientPreKey');
      const sessionFromPrekeyMock = jest.spyOn(cryptoClient, 'sessionFromPrekey');
      jest.spyOn(cryptoClient, 'getRemoteFingerprint').mockResolvedValue(expectedFingerprint);
      jest.spyOn(cryptoClient, 'sessionExists').mockResolvedValue(true);

      const userId = generateQualifiedId('domain');
      const clientId = 'client1';

      const result = await proteusService.getRemoteFingerprint(userId, clientId);

      expect(getPrekeyMock).not.toHaveBeenCalled();
      expect(sessionFromPrekeyMock).not.toHaveBeenCalled();
      expect(result).toBe(expectedFingerprint);
    });
  });

  describe('handleOtrMessageAddEvent', () => {
    const eventPayload: ConversationOtrMessageAddEvent = {
      type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
      qualified_from: generateQualifiedId('domain'),
      data: {sender: 'client1', text: '', recipient: ''},
      conversation: '',
      from: '',
      time: '',
    };
    const decryptedMessage = {} as any;

    it('decrypts incoming proteus encrypted events when session already exists', async () => {
      const [proteusService, {cryptoClient}] = await buildProteusService();
      jest.spyOn(cryptoClient, 'sessionExists').mockResolvedValue(true);
      const createSessionSpy = jest.spyOn(cryptoClient, 'sessionFromMessage');
      jest.spyOn(cryptoClient, 'decrypt').mockResolvedValue(new Uint8Array());
      jest.spyOn(GenericMessage, 'decode').mockReturnValue(decryptedMessage);

      const result = await proteusService.handleOtrMessageAddEvent(eventPayload);

      expect(result).toBeDefined();
      expect(createSessionSpy).not.toHaveBeenCalled();
      expect(result?.decryptedData).toBe(decryptedMessage);
    });

    it('decrypts incoming proteus encrypted and creates session if not already existing', async () => {
      const [proteusService, {cryptoClient}] = await buildProteusService();
      jest.spyOn(cryptoClient, 'sessionExists').mockResolvedValue(false);
      jest.spyOn(cryptoClient, 'saveSession').mockResolvedValue(undefined);
      const createSessionSpy = jest.spyOn(cryptoClient, 'sessionFromMessage').mockResolvedValue(new Uint8Array());
      const decryptSpy = jest.spyOn(cryptoClient, 'decrypt');
      jest.spyOn(GenericMessage, 'decode').mockReturnValue(decryptedMessage);

      const result = await proteusService.handleOtrMessageAddEvent(eventPayload);

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
        data: {firstUser, encryptedMessageBuffer, messageBuffer, domain},
      } = await prepareDataForEncryption();

      const userClients: QualifiedUserClients = {
        [domain]: {
          [firstUser.id.id]: [firstUser.clients.first, firstUser.clients.second],
        },
      };

      const encryptedPayload = new Map([
        [firstUser.sessions.first, encryptedMessageBuffer],
        [firstUser.sessions.second, encryptedMessageBuffer],
      ]);

      jest.spyOn(services.cryptoClient, 'sessionExists').mockResolvedValue(true);
      jest.spyOn(services.cryptoClient, 'encrypt').mockResolvedValueOnce(encryptedPayload);

      const {payloads} = await services.proteusService.encrypt(messageBuffer, userClients);

      expect(services.cryptoClient.encrypt).toHaveBeenCalledWith(
        [firstUser.sessions.first, firstUser.sessions.second],
        messageBuffer,
      );

      expect(payloads).toEqual({
        [domain]: {
          [firstUser.id.id]: {
            [firstUser.clients.first]: encryptedMessageBuffer,
            [firstUser.clients.second]: encryptedMessageBuffer,
          },
        },
      });
    });

    it('returns missing clients and encrypted payload for multiple users', async () => {
      const {
        services,
        data: {firstUser, secondUser, encryptedMessageBuffer, messageBuffer, domain},
      } = await prepareDataForEncryption();

      const userClients: QualifiedUserClients = {
        [domain]: {
          [firstUser.id.id]: [firstUser.clients.first, firstUser.clients.second],
          [secondUser.id.id]: [secondUser.clients.first],
        },
      };

      const encryptedPayload = new Map([
        [firstUser.sessions.first, encryptedMessageBuffer],
        [firstUser.sessions.second, encryptedMessageBuffer],
        [secondUser.sessions.first, encryptedMessageBuffer],
      ]);

      jest.spyOn(services.cryptoClient, 'sessionExists').mockResolvedValue(true);
      jest.spyOn(services.cryptoClient, 'encrypt').mockResolvedValueOnce(encryptedPayload);

      const {payloads} = await services.proteusService.encrypt(messageBuffer, userClients);

      expect(services.cryptoClient.encrypt).toHaveBeenCalledWith(
        [firstUser.sessions.first, firstUser.sessions.second, secondUser.sessions.first],
        messageBuffer,
      );

      expect(payloads).toEqual({
        [domain]: {
          [firstUser.id.id]: {
            [firstUser.clients.first]: encryptedMessageBuffer,
            [firstUser.clients.second]: encryptedMessageBuffer,
          },
          [secondUser.id.id]: {
            [secondUser.clients.first]: encryptedMessageBuffer,
          },
        },
      });
    });

    it('returns the unknown clients that are deleted on backend', async () => {
      const {
        services,
        data: {firstUser, secondUser, encryptedMessageBuffer, messageBuffer, domain},
      } = await prepareDataForEncryption();

      const userClients: QualifiedUserClients = {
        [domain]: {
          [firstUser.id.id]: [firstUser.clients.first, firstUser.clients.second],
          [secondUser.id.id]: [secondUser.clients.first],
        },
      };

      const encryptedPayload = new Map([
        [firstUser.sessions.first, encryptedMessageBuffer],
        [firstUser.sessions.second, encryptedMessageBuffer],
        [secondUser.sessions.first, encryptedMessageBuffer],
      ]);

      jest.spyOn(services.apiClient.api.user, 'postMultiPreKeyBundles').mockResolvedValue({
        qualified_user_client_prekeys: {
          [domain]: {
            [firstUser.id.id]: {
              [firstUser.clients.first]: null,
              [firstUser.clients.second]: {
                id: 123,
                key: 'pQABARhIAqEAWCCaJpFa9c626ORmjj1aV6OnOYgmTjfoiE3ynOfNfGAOmgOhAKEAWCD60VMzRrLfO+1GSjgyhnVp2N7L58DM+eeJhZJi1tBLfQT2',
              },
            },
            [secondUser.id.id]: {
              [secondUser.clients.first]: {
                id: 123,
                key: 'pQABARhIAqEAWCCaJpFa9c626ORmjj1aV6OnOYgmTjfoiE3ynOfNfGAOmgOhAKEAWCD60VMzRrLfO+1GSjgyhnVp2N7L58DM+eeJhZJi1tBLfQT2',
              },
            },
          },
        },
      });
      jest.spyOn(services.cryptoClient, 'sessionExists').mockResolvedValue(false);
      jest.spyOn(services.cryptoClient, 'encrypt').mockResolvedValueOnce(encryptedPayload);
      jest.spyOn(services.cryptoClient, 'sessionFromPrekey').mockResolvedValue();
      jest.spyOn(services.cryptoClient, 'saveSession').mockResolvedValue();

      const {payloads, unknowns} = await services.proteusService.encrypt(messageBuffer, userClients);

      expect(services.cryptoClient.encrypt).toHaveBeenCalledWith(
        [firstUser.sessions.second, secondUser.sessions.first],
        messageBuffer,
      );

      expect(unknowns).toEqual({
        [domain]: {
          [firstUser.id.id]: [firstUser.clients.first],
        },
      });
      expect(payloads).toEqual({
        [domain]: {
          [firstUser.id.id]: {
            [firstUser.clients.first]: encryptedMessageBuffer,
            [firstUser.clients.second]: encryptedMessageBuffer,
          },
          [secondUser.id.id]: {
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
          conversationId: generateQualifiedId('domain'),
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

      [
        {domain: {user1: ['client1'], user2: ['client11', 'client12']}},
        [
          {domain: 'domain', id: 'user1'},
          {domain: 'domain', id: 'user2'},
        ],
      ].forEach(recipients => {
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
            expect.objectContaining({
              reportMissing: [
                {domain: 'domain', id: 'user1'},
                {domain: 'domain', id: 'user2'},
              ],
            }),
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
          const [proteusService] = await buildProteusService();
          MockedRecipients.getRecipientsForConversation.mockResolvedValue({} as any);
          jest.spyOn(proteusService['messageService'], 'sendMessage').mockResolvedValue({} as any);
          await proteusService.sendMessage({
            protocol: ConversationProtocol.PROTEUS,
            conversationId: {id: 'conv1', domain: 'domain1'},
            payload: message,
            targetMode: MessageTargetMode.USERS,
            userIds: recipients,
          });

          expect(proteusService['messageService'].sendMessage).toHaveBeenCalledWith(
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

      [
        {domain: {user1: ['client1'], user2: ['client11', 'client12']}},
        [
          {domain: 'domain', id: 'user1'},
          {domain: 'domain', id: 'user2'},
        ],
      ].forEach(recipients => {
        it(`ignores all missing user/client pair if targetMode is USER_CLIENTS`, async () => {
          const [proteusService] = await buildProteusService();
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
          const [proteusService] = await buildProteusService();

          MockedRecipients.getRecipientsForConversation.mockResolvedValue({} as any);
          jest.spyOn(proteusService['messageService'], 'sendMessage').mockReturnValue(Promise.resolve({} as any));
          await proteusService.sendMessage({
            protocol: ConversationProtocol.PROTEUS,
            conversationId: {id: 'conv1', domain: 'domain1'},
            payload: message,
            targetMode: MessageTargetMode.USERS_CLIENTS,
            userIds: recipients,
          });

          expect(proteusService['messageService'].sendMessage).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Object),
            expect.any(Uint8Array),
            expect.objectContaining({
              reportMissing: false,
            }),
          );
        });
      });

      it(`returns the recipients that will receive the message later`, async () => {
        const [proteusService] = await buildProteusService();
        const recipients: QualifiedUserClients = {
          domain1: {user1: ['client1'], user2: ['client11', 'client12']},
          domain2: {user3: ['client3']},
        };
        MockedRecipients.getRecipientsForConversation.mockResolvedValue({} as any);
        jest.spyOn(proteusService['messageService'], 'sendMessage').mockResolvedValue({
          missing: {},
          redundant: {},
          failed_to_confirm_clients: {domain2: recipients.domain2},
          time: new Date().toISOString(),
          deleted: {},
        });

        const result = await proteusService.sendMessage({
          protocol: ConversationProtocol.PROTEUS,
          conversationId: generateQualifiedId('domain'),
          payload: message,
          targetMode: MessageTargetMode.USERS_CLIENTS,
          userIds: recipients,
        });

        expect(result.state).toBe(MessageSendingState.OUTGOING_SENT);
        expect(result.failedToSend?.queued).toEqual({domain2: recipients.domain2});
      });
    });
  });

  describe('addUsersToConversation', () => {
    const baseResponse = {
      event: {
        conversation: '',
        from: '',
        time: Date.now().toString(),
        data: {users: [], user_ids: []},
        type: CONVERSATION_EVENT.MEMBER_JOIN,
      },
    } satisfies Awaited<ReturnType<typeof ProteusService.prototype.addUsersToConversation>>;

    const conversationId = generateQualifiedId('domain');

    it('adds all requested users to an existing conversation', async () => {
      const [proteusService, {apiClient}] = await buildProteusService();

      jest.spyOn(apiClient.api.conversation, 'postMembers').mockResolvedValueOnce(baseResponse.event);

      const event = await proteusService.addUsersToConversation({
        conversationId,
        qualifiedUsers: [...usersDomain1, ...usersDomain2],
      });

      expect(event).toEqual(baseResponse);
    });

    it('partially add users if some backends are unreachable', async () => {
      const [proteusService, {apiClient}] = await buildProteusService();

      const postMembersSpy = jest
        .spyOn(apiClient.api.conversation, 'postMembers')
        .mockRejectedValueOnce(new FederatedBackendsError(FederatedBackendsErrorLabel.UNREACHABLE_BACKENDS, [domain1]))
        .mockResolvedValueOnce(baseResponse.event);

      const result = await proteusService.addUsersToConversation({
        conversationId,
        qualifiedUsers: [...usersDomain1, ...usersDomain2],
      });

      expect(postMembersSpy).toHaveBeenCalledTimes(2);
      expect(postMembersSpy).toHaveBeenCalledWith(
        conversationId,
        expect.arrayContaining([...usersDomain1, ...usersDomain2]),
      );
      expect(postMembersSpy).toHaveBeenCalledWith(conversationId, expect.arrayContaining(usersDomain2));

      expect(result.failedToAdd?.[0]?.reason).toBe(AddUsersFailureReasons.UNREACHABLE_BACKENDS);
      expect(result.failedToAdd?.[0]?.users).toEqual([...usersDomain1]);
    });

    it('completely fails to add users if some backends are unreachable', async () => {
      const [proteusService, {apiClient}] = await buildProteusService();

      const allUsers = [...usersDomain1, ...usersDomain2];
      const postMembersSpy = jest
        .spyOn(apiClient.api.conversation, 'postMembers')
        .mockRejectedValue(new FederatedBackendsError(FederatedBackendsErrorLabel.UNREACHABLE_BACKENDS, [domain1]));

      const result = await proteusService.addUsersToConversation({
        conversationId,
        qualifiedUsers: allUsers,
      });

      expect(postMembersSpy).toHaveBeenCalledTimes(2);
      expect(postMembersSpy).toHaveBeenCalledWith(conversationId, expect.arrayContaining(allUsers));
      expect(postMembersSpy).toHaveBeenCalledWith(conversationId, expect.arrayContaining(usersDomain2));

      expect(result.failedToAdd?.[0]?.reason).toBe(AddUsersFailureReasons.UNREACHABLE_BACKENDS);
      expect(result.failedToAdd?.[0]?.users).toEqual(allUsers);
    });

    it('partially add users if some users are part of not-connected backends', async () => {
      const [proteusService, {apiClient}] = await buildProteusService();

      const postMembersSpy = jest
        .spyOn(apiClient.api.conversation, 'postMembers')
        .mockRejectedValueOnce(
          new FederatedBackendsError(FederatedBackendsErrorLabel.NON_FEDERATING_BACKENDS, [domain2, domain3]),
        )
        .mockResolvedValueOnce(baseResponse.event);

      const result = await proteusService.addUsersToConversation({
        conversationId,
        qualifiedUsers: [...usersDomain1, ...usersDomain2, ...usersDomain3],
      });

      expect(postMembersSpy).toHaveBeenCalledTimes(2);
      expect(postMembersSpy).toHaveBeenCalledWith(
        conversationId,
        expect.arrayContaining([...usersDomain1, ...usersDomain2]),
      );
      expect(postMembersSpy).toHaveBeenCalledWith(conversationId, expect.arrayContaining(usersDomain1));

      expect(result.failedToAdd?.[0]?.reason).toBe(AddUsersFailureReasons.NON_FEDERATING_BACKENDS);
      expect(result.failedToAdd?.[0]?.users).toEqual([...usersDomain2, ...usersDomain3]);
    });
  });

  describe('createConversation', () => {
    const newConversation: Conversation = {
      qualified_id: {id: '', domain: ''},
      type: CONVERSATION_TYPE.REGULAR,
      creator: '',
      cells_state: CONVERSATION_CELLS_STATE.DISABLED,
      access: [],
      access_role: [CONVERSATION_ACCESS_ROLE.GUEST],
      members: {
        others: [],
        self: {
          qualified_id: {id: '', domain: ''},
          hidden_ref: null,
          id: '',
          otr_archived_ref: null,
          otr_muted_ref: null,
          otr_muted_status: null,
          service: null,
          status_ref: '',
          status_time: '',
        },
      },
      protocol: ConversationProtocol.PROTEUS,
    };

    it('adds all requested users to a new conversation', async () => {
      const [proteusService, {apiClient}] = await buildProteusService();

      jest.spyOn(apiClient.api.conversation, 'postConversation').mockResolvedValueOnce({...newConversation});

      const result = await proteusService.createConversation({
        receipt_mode: null,
        qualified_users: [...usersDomain1, ...usersDomain2, ...usersDomain3],
      });

      expect(result.conversation).toEqual(newConversation);
      expect(result.failedToAdd).toBeUndefined();
    });

    it('partially add users if some backends are unreachable', async () => {
      const [proteusService, {apiClient}] = await buildProteusService();

      const postConversationSpy = jest
        .spyOn(apiClient.api.conversation, 'postConversation')
        .mockRejectedValueOnce(new FederatedBackendsError(FederatedBackendsErrorLabel.UNREACHABLE_BACKENDS, [domain1]))
        .mockResolvedValueOnce(newConversation);

      const {failedToAdd} = await proteusService.createConversation({
        receipt_mode: null,
        qualified_users: [...usersDomain1, ...usersDomain2],
      });

      expect(postConversationSpy).toHaveBeenCalledTimes(2);
      expect(postConversationSpy).toHaveBeenCalledWith(
        expect.objectContaining({qualified_users: [...usersDomain1, ...usersDomain2]}),
      );
      expect(postConversationSpy).toHaveBeenCalledWith(expect.objectContaining({qualified_users: usersDomain2}));

      expect(failedToAdd).toEqual([
        {
          reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
          backends: ['domain1'],
          users: expect.arrayContaining([...usersDomain1, ...usersDomain1]),
        },
      ]);
    });

    it('creates an empty conversation if no backend is reachable', async () => {
      const [proteusService, {apiClient}] = await buildProteusService();

      const postConversationSpy = jest
        .spyOn(apiClient.api.conversation, 'postConversation')
        .mockRejectedValueOnce(
          new FederatedBackendsError(FederatedBackendsErrorLabel.UNREACHABLE_BACKENDS, [domain1, domain2]),
        )
        .mockResolvedValueOnce({} as any);

      const {failedToAdd} = await proteusService.createConversation({
        receipt_mode: null,
        qualified_users: [...usersDomain1, ...usersDomain2],
      });

      expect(postConversationSpy).toHaveBeenCalledTimes(2);
      expect(postConversationSpy).toHaveBeenCalledWith(
        expect.objectContaining({qualified_users: [...usersDomain1, ...usersDomain2]}),
      );
      expect(postConversationSpy).toHaveBeenCalledWith(expect.objectContaining({qualified_users: []}));

      expect(failedToAdd).toEqual([
        {
          reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
          backends: [domain1, domain2],
          users: expect.arrayContaining([...usersDomain1, ...usersDomain1]),
        },
      ]);
    });

    it('fails to create a conversation if there are users from non-connected backends', async () => {
      const [proteusService, {apiClient}] = await buildProteusService();

      jest
        .spyOn(apiClient.api.conversation, 'postConversation')
        .mockRejectedValueOnce(
          new FederatedBackendsError(FederatedBackendsErrorLabel.NON_FEDERATING_BACKENDS, [domain1, domain2]),
        );

      await expect(() =>
        proteusService.createConversation({
          receipt_mode: null,
          qualified_users: [...usersDomain1, ...usersDomain2],
        }),
      ).rejects.toThrow(NonFederatingBackendsError);
    });
  });
});
