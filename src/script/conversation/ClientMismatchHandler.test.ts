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

import {GenericMessage, Text} from '@wireapp/protocol-messaging';
import {ClientClassification} from '@wireapp/api-client/src/client/';
import type {ClientMismatch, NewOTRMessage, UserClients} from '@wireapp/api-client/src/conversation';
import {createRandomUuid} from 'Util/util';
import {GENERIC_MESSAGE_TYPE} from 'src/script/cryptography/GenericMessageType';
import {Conversation} from 'src/script/entity/Conversation';
import {EventInfoEntity} from 'src/script/conversation/EventInfoEntity';
import {ClientMismatchHandler} from 'src/script/conversation/ClientMismatchHandler';
import type {ConversationRepository} from './ConversationRepository';
import type {CryptographyRepository} from '../cryptography/CryptographyRepository';
import type {UserRepository} from '../user/UserRepository';
import {entities} from '../../../test/api/payloads';

describe('ClientMismatchHandler', () => {
  describe('onClientMismatch', () => {
    const johnDoe = {
      client_id: 'd13a2ec9b6436122',
      user_id: entities.user.john_doe.id,
    };
    const janeRoe = {
      client_id: 'edc943ba4d6ef6b1',
      user_id: entities.user.jane_roe.id,
    };
    const payload: NewOTRMessage<string> = {
      recipients: {
        [janeRoe.user_id]: {
          [janeRoe.client_id]: '💣',
        },
      },
      sender: '43619b6a2ec22e24',
    };

    it('should trigger member-join event if new user is detected', async () => {
      const knownUserId = johnDoe.user_id;
      const unknownUserId = janeRoe.user_id;
      const conversation = new Conversation(createRandomUuid());
      conversation.participating_user_ids([{domain: null, id: knownUserId}]);

      const userRepositorySpy: Partial<UserRepository> = {
        addClientToUser: jest.fn(),
        findUserById: jest.fn().mockImplementation((userId: string) => {
          return {
            id: userId,
          };
        }),
        getClientsByUsers: jest.fn().mockImplementation(() =>
          Promise.resolve({
            [johnDoe.user_id]: [
              {class: ClientClassification.DESKTOP, id: johnDoe.client_id},
              {class: ClientClassification.PHONE, id: '809fd276d6709474'},
            ],
          }),
        ),
      };
      const conversationRepositorySpy: Partial<ConversationRepository> = {
        addMissingMember: jest.fn(),
        getConversationById: jest.fn().mockImplementation(() => Promise.resolve(conversation)),
        verificationStateHandler: {
          onClientsAdded: jest.fn(),
        } as any,
      };
      const cryptographyRepositorySpy: Partial<CryptographyRepository> = {
        encryptGenericMessage: jest.fn(),
      };

      const clientMismatchHandler = new ClientMismatchHandler(
        () => conversationRepositorySpy as ConversationRepository,
        cryptographyRepositorySpy as CryptographyRepository,
        userRepositorySpy as UserRepository,
      );

      const clientMismatch: ClientMismatch = {
        deleted: {},
        missing: {
          [knownUserId]: [johnDoe.client_id],
          [unknownUserId]: [janeRoe.client_id],
        },
        redundant: {},
        time: '2016-04-29T10:38:23.002Z',
      };

      const timestamp = new Date(clientMismatch.time).getTime();
      const eventInfoEntity = new EventInfoEntity(undefined, conversation.id);
      eventInfoEntity.setTimestamp(clientMismatch.time);

      await clientMismatchHandler.onClientMismatch(eventInfoEntity, clientMismatch, payload);
      expect(conversationRepositorySpy.addMissingMember).toHaveBeenCalledWith(
        conversation,
        [{domain: null, id: unknownUserId}],
        timestamp - 1,
      );
    });

    it('should add missing clients to the payload', async () => {
      const conversation = new Conversation(createRandomUuid());
      const userRepositorySpy: Partial<UserRepository> = {
        addClientToUser: jest.fn(),
        findUserById: jest.fn().mockImplementation((userId: string) => {
          return {
            id: userId,
          };
        }),
        getClientsByUsers: jest.fn().mockImplementation(() =>
          Promise.resolve({
            [johnDoe.user_id]: [
              {class: ClientClassification.DESKTOP, id: johnDoe.client_id},
              {class: ClientClassification.PHONE, id: '809fd276d6709474'},
            ],
          }),
        ),
      };
      const conversationRepositorySpy: Partial<ConversationRepository> = {
        addMissingMember: jest.fn(),
        getConversationById: jest.fn().mockImplementation(() => Promise.resolve(conversation)),
        verificationStateHandler: {
          onClientsAdded: jest.fn(), // params `missingUserIds`
        } as any,
      };
      const cryptographyRepositorySpy: Partial<CryptographyRepository> = {
        encryptGenericMessage: jest.fn(),
        getUsersPreKeys: jest.fn().mockImplementation(() => Promise.resolve()),
      };

      const clientMismatchHandler = new ClientMismatchHandler(
        () => conversationRepositorySpy as ConversationRepository,
        cryptographyRepositorySpy as CryptographyRepository,
        userRepositorySpy as UserRepository,
      );

      const message = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.TEXT]: new Text({content: 'Test'}),
        messageId: createRandomUuid(),
      });
      const eventInfoEntity = new EventInfoEntity(message, conversation.id);

      const clientMismatch: ClientMismatch = {
        deleted: {},
        missing: {
          [johnDoe.user_id]: [`${johnDoe.client_id}`],
        },
        redundant: {},
        time: '2016-04-29T10:38:23.002Z',
      };
      const payload: NewOTRMessage<string> = {
        recipients: {
          [janeRoe.user_id]: {
            [janeRoe.client_id]: '💣',
          },
        },
        sender: '43619b6a2ec22e24',
      };

      eventInfoEntity.setTimestamp(clientMismatch.time);
      await clientMismatchHandler.onClientMismatch(eventInfoEntity, clientMismatch, payload);

      const expectedReceipients: UserClients = {
        [johnDoe.user_id]: [johnDoe.client_id],
      };
      expect(cryptographyRepositorySpy.encryptGenericMessage).toHaveBeenCalledWith(
        expectedReceipients,
        message,
        payload,
      );
    });

    it('should remove the payload of deleted clients', async () => {
      const conversation = new Conversation(createRandomUuid());
      const userRepositorySpy: Partial<UserRepository> = {
        getUserFromBackend: jest.fn().mockImplementation(() => Promise.resolve({deleted: true})),
        removeClientFromUser: jest.fn(),
      };
      const conversationRepositorySpy: Partial<ConversationRepository> = {
        getConversationById: jest.fn().mockImplementation(() => Promise.resolve(conversation)),
      };
      const clientMismatchHandler = new ClientMismatchHandler(
        () => conversationRepositorySpy as ConversationRepository,
        {} as CryptographyRepository,
        userRepositorySpy as UserRepository,
      );

      const message = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.TEXT]: new Text({content: 'Test'}),
        messageId: createRandomUuid(),
      });
      const eventInfoEntity = new EventInfoEntity(message, conversation.id);

      const clientMismatch: ClientMismatch = {
        deleted: {
          [janeRoe.user_id]: [`${janeRoe.client_id}`],
        },
        missing: {},
        redundant: {},
        time: '2016-04-29T10:38:23.002Z',
      };
      const payload: NewOTRMessage<string> = {
        recipients: {
          [janeRoe.user_id]: {
            [janeRoe.client_id]: '💣',
          },
        },
        sender: '43619b6a2ec22e24',
      };

      const updatedPayload = await clientMismatchHandler.onClientMismatch(eventInfoEntity, clientMismatch, payload);

      expect(updatedPayload).toBeDefined();
      expect(userRepositorySpy.removeClientFromUser).toHaveBeenCalled();
      expect(Object.keys(updatedPayload.recipients).length).toBe(0);
    });

    it('should remove the payload of redundant clients', async () => {
      const conversation = new Conversation(createRandomUuid());
      const userRepositorySpy: Partial<UserRepository> = {
        getUserFromBackend: jest.fn().mockImplementation(() => Promise.resolve({deleted: true})),
        removeClientFromUser: jest.fn(),
      };
      const conversationRepositorySpy: Partial<ConversationRepository> = {
        getConversationById: jest.fn().mockImplementation(() => Promise.resolve(conversation)),
      };

      const clientMismatchHandler = new ClientMismatchHandler(
        () => conversationRepositorySpy as ConversationRepository,
        {} as CryptographyRepository,
        userRepositorySpy as UserRepository,
      );

      const message = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.TEXT]: new Text({content: 'Test'}),
        messageId: createRandomUuid(),
      });
      const eventInfoEntity = new EventInfoEntity(message, conversation.id);

      const clientMismatch: ClientMismatch = {
        deleted: {},
        missing: {},
        redundant: {
          [janeRoe.user_id]: [`${janeRoe.client_id}`],
        },
        time: '2016-04-29T10:38:23.002Z',
      };
      const payload: NewOTRMessage<string> = {
        recipients: {
          [janeRoe.user_id]: {
            [janeRoe.client_id]: '💣',
          },
        },
        sender: '43619b6a2ec22e24',
      };

      const updated_payload = await clientMismatchHandler.onClientMismatch(eventInfoEntity, clientMismatch, payload);

      expect(userRepositorySpy.removeClientFromUser).not.toHaveBeenCalled();
      expect(Object.keys(updated_payload.recipients).length).toBe(0);
    });
  });
});
