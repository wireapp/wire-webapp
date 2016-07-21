#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
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
      cryptography_repository.cryptobox =
        session_save: -> true
        session_load: (session_id) -> new cryptobox.CryptoboxSession session_id
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

    it 'can load a cryptographic session', (done) ->
      expected_session_id = "#{john_doe.id}@#{john_doe.clients.phone_id}"
      cryptography_repository.get_session john_doe.id, john_doe.clients.phone_id
      .then (session) ->
        expect(session.id).toBe expected_session_id
        done()
      .catch done.fail

    it 'can encrypt a generic message', (done) ->
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

    it 'can construct an encrypted payload for multiple cryptographic sessions', ->

      cryptobox_session_map =
        "#{john_doe.id}":
          "#{john_doe.clients.phone_id}": new cryptobox.CryptoboxSession "#{john_doe.id}@#{john_doe.clients.phone_id}"
          "#{john_doe.clients.desktop_id}": new cryptobox.CryptoboxSession "#{john_doe.id}@#{john_doe.clients.desktop_id}"
        "#{jane_roe.id}":
          "#{jane_roe.clients.phone_id}": new cryptobox.CryptoboxSession "#{jane_roe.id}@#{jane_roe.clients.phone_id}"

      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'text', new z.proto.Text 'Unit test'

      sender = 'd74c38a7819c98d5'

      payload = cryptography_repository._construct_payload sender
      expect(payload.sender).toBe sender
      expect(payload.recipients).toBeTruthy()

      payload = cryptography_repository._add_payload_recipients payload, generic_message, cryptobox_session_map
      expect(Object.keys(payload.recipients).length).toBe 2
      expect(Object.keys(payload.recipients[john_doe.id]).length).toBe 2
      expect(Object.keys(payload.recipients[jane_roe.id]).length).toBe 1
      expect(_.isString(payload.recipients[jane_roe.id][jane_roe.clients.phone_id])).toBeTruthy()

  describe 'Sessions', ->
    it 'saves and loads a session', (done) ->
      spyOn cryptography_repository.cryptobox, 'session_save'
      spyOn(cryptography_repository.cryptobox, 'session_load').and.callThrough()
      spyOn cryptography_repository, '_initiate_new_session'

      client_id = '4b0a0fbf418d264c'
      user_id = '034060fe-8406-476e-b29d-f0a214c0345b'
      session = new cryptobox.CryptoboxSession "#{user_id}@#{client_id}"

      cryptography_repository.save_session session
      cryptography_repository.get_session user_id, client_id
      .then ->
        expect(cryptography_repository.cryptobox.session_save).toHaveBeenCalled()
        expect(cryptography_repository.cryptobox.session_load).toHaveBeenCalled()
        expect(cryptography_repository._initiate_new_session).not.toHaveBeenCalled()
        done()
      .catch done.fail
