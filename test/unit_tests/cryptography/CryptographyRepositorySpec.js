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

// grunt test_init && grunt test_run:cryptography/CryptographyRepository

'use strict';

describe('z.cryptography.CryptographyRepository', function() {
  const test_factory = new TestFactory();

  beforeAll(function(done) {
    z.util.protobuf.load_protos('ext/proto/generic-message-proto/messages.proto')
      .then(() => test_factory.exposeCryptographyActors())
      .then(done)
      .catch(done.fail);
  });

  describe('encrypt_generic_message', function() {
    let jane_roe = undefined;
    let john_doe = undefined;

    beforeAll(function() {
      john_doe = {
        clients: {
          desktop_id: 'b29034060fed476e',
          phone_id: '4b0a0fbf418d264c',
        },
        id: entities.user.john_doe.id,
      };

      return jane_roe = {
        clients: {
          phone_id: '55cdd1dbe3c2ed74',
        },
        id: entities.user.jane_roe.id,
      };
    });

    it('encrypts a generic message', function(done) {
      spyOn(TestFactory.cryptography_service, 'get_users_pre_keys').and.callFake((recipients) =>
        Promise.resolve().then(function() {
          const prekey_map = {};

          for (const user_id in recipients) {
            if (recipients.hasOwnProperty(user_id)) {
              const client_ids = recipients[user_id];

              prekey_map[user_id] = prekey_map[user_id] || {};

              client_ids.forEach(function(client_id) {
                prekey_map[user_id][client_id] = {
                  id: 65535,
                  key: 'pQABARn//wKhAFgg3OpuTCUwDZMt1fklZB4M+fjDx/3fyx78gJ6j3H3dM2YDoQChAFggQU1orulueQHLv5YDYqEYl3D4O0zA9d+TaGGXXaBJmK0E9g==',
                };
              });
            }
          }

          return prekey_map;
        })
      );

      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.TEXT, new z.proto.Text('Unit test'));

      const recipients = {};
      recipients[john_doe.id] = [john_doe.clients.phone_id, john_doe.clients.desktop_id];
      recipients[jane_roe.id] = [jane_roe.clients.phone_id];

      TestFactory.cryptography_repository.encrypt_generic_message(recipients, generic_message)
        .then(function(payload) {
          expect(payload.recipients).toBeTruthy();
          expect(Object.keys(payload.recipients).length).toBe(2);
          expect(Object.keys(payload.recipients[john_doe.id]).length).toBe(2);
          expect(Object.keys(payload.recipients[jane_roe.id]).length).toBe(1);
          expect(_.isString(payload.recipients[jane_roe.id][jane_roe.clients.phone_id])).toBeTruthy();
          done();
        })
        .catch(done.fail);
    });
  });

  describe('handle_encrypted_event', function() {
    it('detects a session reset request', function(done) {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {"conversation": "f1d2d451-0fcb-4313-b0ba-313b971ab758", "time": "2017-03-22T11:06:29.232Z", "data": {"text": "💣", "sender": "e35e4ee5b80a1a9d", "recipient": "7481c47f2f7336d8"}, "from": "e3ff8dab-1407-4890-b9d3-e1aab49233e8", "type": "conversation.otr-message-add"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      TestFactory.cryptography_repository.handle_encrypted_event(event)
        .then((mapped_event) => {
          expect(mapped_event.type).toBe(z.event.Client.CONVERSATION.UNABLE_TO_DECRYPT);
          done();
        })
        .catch(done.fail);
    });

    it('only accept reasonable sized payload', function(done) {
      // Length of this message is 1 320 024 while the maximum is 150% of 8 000 (12 000)
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const text = window.btoa(`https://wir${"\u0000\u0001\u0000\u000D\u0000A".repeat(165000)}e.com/`);
      const event = {"conversation":"7bc4558b-18ce-446b-8e62-0c442b86ba56","time":"2017-06-15T22:18:55.071Z","data":{"text":text,"sender":"ccc17722a9348793","recipient":"4d7a36b30ef8bc26"},"from":"8549aada-07cc-4272-9fd4-c2ae040c539d","type":"conversation.otr-message-add"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      TestFactory.cryptography_repository.handle_encrypted_event(event)
        .then((mapped_event) => {
          expect(mapped_event.type).toBe(z.event.Client.CONVERSATION.INCOMING_MESSAGE_TOO_BIG);
          done();
        })
        .catch(done.fail);
    });
  });
});
