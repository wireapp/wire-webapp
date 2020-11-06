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
import {GENERIC_MESSAGE_TYPE} from 'src/script/cryptography/GenericMessageType';

import {createRandomUuid} from 'Util/util';

import {Conversation} from 'src/script/entity/Conversation';
import {EventInfoEntity} from 'src/script/conversation/EventInfoEntity';
import {TestFactory} from '../../helper/TestFactory';

describe('ClientMismatchHandler', () => {
  const testFactory = new TestFactory();

  let conversationEntity = undefined;

  beforeEach(async () => {
    await testFactory.exposeStorageActors();
    return testFactory.exposeConversationActors().then(conversationRepository => {
      conversationEntity = new Conversation(createRandomUuid());
      return conversationRepository.saveConversation(conversationEntity);
    });
  });

  afterEach(() => testFactory.conversation_repository.conversationState.conversations.removeAll());

  describe('onClientMismatch', () => {
    let clientMismatch = undefined;
    let genericMessage = undefined;
    let payload = undefined;

    let johnDoe = undefined;
    let janeRoe = undefined;

    beforeAll(() => {
      genericMessage = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.TEXT]: new Text({content: 'Test'}),
        messageId: createRandomUuid(),
      });

      johnDoe = {
        client_id: 'd13a2ec9b6436122',
        user_id: entities.user.john_doe.id,
      };
      janeRoe = {
        client_id: 'edc943ba4d6ef6b1',
        user_id: entities.user.jane_roe.id,
      };
    });

    beforeEach(() => {
      spyOn(testFactory.user_repository, 'removeClientFromUser').and.returnValue(Promise.resolve());

      payload = {
        recipients: {
          [janeRoe.user_id]: {
            [janeRoe.client_id]: '💣',
          },
        },
        sender: '43619b6a2ec22e24',
      };
    });

    it('should trigger member-join event if new user is detected', () => {
      const conversationId = conversationEntity.id;
      const knownUserId = johnDoe.user_id;
      const unknownUserId = janeRoe.user_id;

      conversationEntity.participating_user_ids([knownUserId]);

      clientMismatch = {
        deleted: {},
        missing: {
          [knownUserId]: [johnDoe.client_id],
          [unknownUserId]: [janeRoe.client_id],
        },
        redundant: {},
        time: '2016-04-29T10:38:23.002Z',
      };

      spyOn(testFactory.conversation_repository.userState, 'self').and.returnValue({id: 'self-id'});
      spyOn(testFactory.conversation_repository, 'addMissingMember').and.returnValue(Promise.resolve());
      spyOn(testFactory.cryptography_repository, 'encryptGenericMessage').and.returnValue(Promise.resolve(payload));
      spyOn(testFactory.user_repository, 'addClientToUser').and.returnValue(Promise.resolve());
      spyOn(testFactory.user_repository, 'getClientsByUserId').and.callFake(clientId => {
        return Promise.resolve([
          {class: 'desktop', id: clientId},
          {class: 'phone', id: '809fd276d6709474'},
        ]);
      });

      const timestamp = new Date(clientMismatch.time).getTime();
      const eventInfoEntity = new EventInfoEntity(undefined, conversationId);
      eventInfoEntity.setTimestamp(timestamp);
      return testFactory.message_repository.clientMismatchHandler
        .onClientMismatch(eventInfoEntity, clientMismatch, payload)
        .then(() => {
          expect(testFactory.conversation_repository.addMissingMember).toHaveBeenCalledWith(
            conversationEntity,
            [unknownUserId],
            timestamp - 1,
          );
        });
    });

    it('should add missing clients to the payload', () => {
      spyOn(testFactory.event_repository.userState, 'self').and.returnValue({id: 'self-id'});
      spyOn(testFactory.user_repository, 'getClientsByUserId').and.callFake(clientId => {
        return Promise.resolve([
          {class: 'desktop', id: clientId},
          {class: 'phone', id: '809fd276d6709474'},
        ]);
      });
      spyOn(testFactory.user_repository, 'addClientToUser').and.returnValue(Promise.resolve());
      // TODO: Make this fake method available as a utility function for testing
      spyOn(testFactory.cryptography_repository.cryptographyService, 'getUsersPreKeys').and.callFake(recipients => {
        return Promise.resolve().then(() => {
          const preKeyMap = {};

          for (const userId in recipients) {
            if (recipients.hasOwnProperty(userId)) {
              const clientIds = recipients[userId];
              preKeyMap[userId] = preKeyMap[userId] || {};

              clientIds.forEach(clientId => {
                preKeyMap[userId][clientId] = {
                  id: 65535,
                  key:
                    'pQABARn//wKhAFgg3OpuTCUwDZMt1fklZB4M+fjDx/3fyx78gJ6j3H3dM2YDoQChAFggQU1orulueQHLv5YDYqEYl3D4O0zA9d+TaGGXXaBJmK0E9g==',
                };
              });
            }
          }

          return preKeyMap;
        });
      });

      clientMismatch = {
        deleted: {},
        missing: {
          [johnDoe.user_id]: [`${johnDoe.client_id}`],
        },
        redundant: {},
        time: '2016-04-29T10:38:23.002Z',
      };

      return testFactory.cryptography_repository.initCryptobox().then(() => {
        const eventInfoEntity = new EventInfoEntity(genericMessage, conversationEntity.id);
        eventInfoEntity.setTimestamp(new Date(clientMismatch.time).getTime());
        return testFactory.message_repository.clientMismatchHandler
          .onClientMismatch(eventInfoEntity, clientMismatch, payload)
          .then(updatedPayload => {
            expect(Object.keys(updatedPayload.recipients).length).toBe(2);
            expect(Object.keys(updatedPayload.recipients[johnDoe.user_id]).length).toBe(1);
          });
      });
    });

    it('should remove the payload of deleted clients', () => {
      spyOn(testFactory.user_repository, 'getUserFromBackend').and.callFake(() => {
        return Promise.resolve({
          deleted: true,
        });
      });

      clientMismatch = {
        deleted: {
          [janeRoe.user_id]: [`${janeRoe.client_id}`],
        },
        missing: {},
        redundant: {},
        time: '2016-04-29T10:38:23.002Z',
      };

      const eventInfoEntity = new EventInfoEntity(genericMessage, conversationEntity.id);
      return testFactory.message_repository.clientMismatchHandler
        .onClientMismatch(eventInfoEntity, clientMismatch, payload)
        .then(updatedPayload => {
          expect(testFactory.user_repository.removeClientFromUser).toHaveBeenCalled();
          expect(Object.keys(updatedPayload.recipients).length).toBe(0);
        });
    });

    it('should remove the payload of redundant clients', () => {
      spyOn(testFactory.user_repository, 'getUserFromBackend').and.callFake(() => {
        return Promise.resolve({
          deleted: true,
        });
      });

      clientMismatch = {
        deleted: {},
        missing: {},
        redundant: {
          [janeRoe.user_id]: [`${janeRoe.client_id}`],
        },
        time: '2016-04-29T10:38:23.002Z',
      };

      const eventInfoEntity = new EventInfoEntity(genericMessage, conversationEntity.id);
      return testFactory.message_repository.clientMismatchHandler
        .onClientMismatch(eventInfoEntity, clientMismatch, payload)
        .then(updated_payload => {
          expect(testFactory.user_repository.removeClientFromUser).not.toHaveBeenCalled();
          expect(Object.keys(updated_payload.recipients).length).toBe(0);
        });
    });
  });
});
