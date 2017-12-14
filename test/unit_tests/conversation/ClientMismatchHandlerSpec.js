/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

// grunt test_init && grunt test_run:conversation/ClientMismatchHandler

'use strict';

describe('ClientMismatchHandler', () => {
  const testFactory = new TestFactory();

  let conversationEt = undefined;

  beforeAll(done => {
    z.util.protobuf
      .load_protos('ext/proto/generic-message-proto/messages.proto')
      .then(done)
      .catch(done.fail);
  });

  beforeEach(done => {
    testFactory
      .exposeConversationActors()
      .then(conversationRepository => {
        conversationEt = new z.entity.Conversation(z.util.create_random_uuid());
        return conversationRepository.save_conversation(conversationEt);
      })
      .then(done)
      .catch(done.fail);
  });

  afterEach(() => {
    TestFactory.conversation_repository.conversations.removeAll();
  });

  describe('onClientMismatch', () => {
    let clientMismatch = undefined;
    let genericMessage = undefined;
    let payload = undefined;

    let johnDoe = undefined;
    let janeRoe = undefined;

    beforeAll(() => {
      genericMessage = new z.proto.GenericMessage(z.util.create_random_uuid());
      genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.TEXT, new z.proto.Text('Test'));

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
      spyOn(TestFactory.user_repository, 'remove_client_from_user').and.returnValue(Promise.resolve());

      payload = {
        recipients: {
          [janeRoe.user_id]: {
            [janeRoe.client_id]: '💣',
          },
        },
        sender: '43619b6a2ec22e24',
      };
    });

    it('should add missing clients to the payload', done => {
      spyOn(TestFactory.user_repository, 'add_client_to_user').and.returnValue(Promise.resolve());
      // TODO: Make this fake method available as a utility function for testing
      spyOn(TestFactory.cryptography_repository.cryptography_service, 'get_users_pre_keys').and.callFake(recipients => {
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

      TestFactory.conversation_repository.clientMismatchHandler
        .onClientMismatch(clientMismatch, conversationEt.id, genericMessage, payload)
        .then(updatedPayload => {
          expect(Object.keys(updatedPayload.recipients).length).toBe(2);
          expect(Object.keys(updatedPayload.recipients[johnDoe.user_id]).length).toBe(1);
          done();
        })
        .catch(done.fail);
    });

    it('should remove the payload of deleted clients', done => {
      clientMismatch = {
        deleted: {
          [janeRoe.user_id]: [`${janeRoe.client_id}`],
        },
        missing: {},
        redundant: {},
        time: '2016-04-29T10:38:23.002Z',
      };

      TestFactory.conversation_repository.clientMismatchHandler
        .onClientMismatch(clientMismatch, conversationEt.id, genericMessage, payload)
        .then(updatedPayload => {
          expect(TestFactory.user_repository.remove_client_from_user).toHaveBeenCalled();
          expect(Object.keys(updatedPayload.recipients).length).toBe(0);
          done();
        })
        .catch(done.fail);
    });

    it('should remove the payload of redundant clients', done => {
      clientMismatch = {
        deleted: {},
        missing: {},
        redundant: {
          [janeRoe.user_id]: [`${janeRoe.client_id}`],
        },
        time: '2016-04-29T10:38:23.002Z',
      };

      TestFactory.conversation_repository.clientMismatchHandler
        .onClientMismatch(clientMismatch, conversationEt.id, genericMessage, payload)
        .then(updated_payload => {
          expect(TestFactory.user_repository.remove_client_from_user).not.toHaveBeenCalled();
          expect(Object.keys(updated_payload.recipients).length).toBe(0);
          done();
        })
        .catch(done.fail);
    });
  });
});
