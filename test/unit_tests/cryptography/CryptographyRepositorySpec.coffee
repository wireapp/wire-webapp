#
# Wire
# Copyright (C) 2017 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

# grunt test_init && grunt test_run:cryptography/CryptographyRepository

describe 'z.cryptography.CryptographyRepository', ->
  test_factory = new TestFactory()

  beforeAll (done) ->
    z.util.protobuf.load_protos 'ext/proto/generic-message-proto/messages.proto'
    .then ->
      test_factory.exposeCryptographyActors()
    .then ->
      done()
    .catch done.fail

  describe 'Encryption', ->
    jane_roe = undefined
    john_doe = undefined

    beforeAll ->
      john_doe =
        id: entities.user.john_doe.id
        clients:
          phone_id: '4b0a0fbf418d264c'
          desktop_id: 'b29034060fed476e'

      jane_roe =
        id: entities.user.jane_roe.id
        clients:
          phone_id: '55cdd1dbe3c2ed74'

    it 'encrypts a generic message', (done) ->
      spyOn(cryptography_repository.cryptography_service, 'get_users_pre_keys').and.callFake (user_client_map) ->
        return Promise.resolve().then () ->
          prekey_map = {}

          for user_id of user_client_map
            prekey_map[user_id] ?= {}
            for client_id in user_client_map[user_id]
              prekey_map[user_id][client_id] = {
                key: 'pQABARn//wKhAFgg3OpuTCUwDZMt1fklZB4M+fjDx/3fyx78gJ6j3H3dM2YDoQChAFggQU1orulueQHLv5YDYqEYl3D4O0zA9d+TaGGXXaBJmK0E9g=='
                id: 65535
              }

          return prekey_map

      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'text', new z.proto.Text 'Unit test'

      user_client_map = {}
      user_client_map[john_doe.id] = [john_doe.clients.phone_id, john_doe.clients.desktop_id]
      user_client_map[jane_roe.id] = [jane_roe.clients.phone_id]

      cryptography_repository.encrypt_generic_message user_client_map, generic_message
      .then (payload) ->
        expect(payload.recipients).toBeTruthy()
        expect(Object.keys(payload.recipients).length).toBe 2
        expect(Object.keys(payload.recipients[john_doe.id]).length).toBe 2
        expect(Object.keys(payload.recipients[jane_roe.id]).length).toBe 1
        expect(_.isString(payload.recipients[jane_roe.id][jane_roe.clients.phone_id])).toBeTruthy()
        done()
      .catch done.fail
