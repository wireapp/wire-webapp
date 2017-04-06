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

window.z ?= {}
z.cryptography ?= {}

# Cryptography repository for all cryptography interactions with the cryptography service.
class z.cryptography.CryptographyRepository
  @::SYMBOL =
    SENDER_FAILED_TO_DECRYPT: '💣'

  ###
  Construct a new Cryptography repository.
  @param cryptography_service [z.cryptography.CryptographyService] Backend REST API cryptography service implementation
  @param storage_repository [z.storage.StorageRepository] Repository for all storage interactions
  ###
  constructor: (@cryptography_service, @storage_repository, @conversation_service) ->
    @logger = new z.util.Logger 'z.cryptography.CryptographyRepository', z.config.LOGGER.OPTIONS

    @cryptography_mapper = new z.cryptography.CryptographyMapper()

    @current_client = undefined
    @cryptobox = undefined
    return @

  ###
  Initialize the repository.
  @return [Promise] Promise that will resolve with the repository after initialization
  ###
  init: (db) =>
    return Promise.resolve()
    .then =>
      @logger.info "Initializing Cryptobox with database '#{db.name}'..."
      cryptobox_store = new cryptobox.store.IndexedDB db
      @cryptobox = new cryptobox.Cryptobox cryptobox_store, 10

      @cryptobox.on cryptobox.Cryptobox.TOPIC.NEW_PREKEYS, (data) =>
        serialized_prekeys = data.map (pre_key) =>
          return @cryptobox.serialize_prekey pre_key

        @logger.log "Received '#{data.length}' new PreKeys.", serialized_prekeys
        @cryptography_service.put_client_prekeys @current_client().id, serialized_prekeys
        .then =>
          @logger.log "Successfully uploaded '#{serialized_prekeys.length}' PreKeys."

      @cryptobox.on cryptobox.Cryptobox.TOPIC.NEW_SESSION, (session_id) ->
        {user_id, client_id} = z.client.Client.dismantle_user_client_id session_id
        amplify.publish z.event.WebApp.CLIENT.ADD, user_id, new z.client.Client id: client_id

      return @cryptobox.init()
    .then =>
      return @

  ###
  Generate all keys need for client registration.
  @return [Promise] Promise that resolves with an array of last resort key, pre-keys, and signaling keys
  ###
  generate_client_keys: =>
    return Promise.all([
      @cryptobox.get_serialized_last_resort_prekey()
      @cryptobox.get_serialized_standard_prekeys()
      @_generate_signaling_keys()
    ]).catch (error) ->
      throw new Error "Failed to generate client keys: #{error.message}"

  ###
  Get the fingerprint of the local identity.
  @return [String] Fingerprint of local identity public key
  ###
  get_local_fingerprint: =>
    return @cryptobox.identity.public_key.fingerprint()

  ###
  Get the fingerprint of a remote identity.
  @param user_id [String] ID of user
  @param client_id [String] ID of client
  ###
  get_remote_fingerprint: (user_id, client_id) =>
    return @_load_session(user_id, client_id)
    .then (cryptobox_session) ->
      return cryptobox_session.fingerprint_remote()

  ###
  Get a pre-key for client of in the user client map.
  @param user_client_map [Object] User client map to request pre-keys for
  @return [Promise] Promise that resolves a map of pre-keys for the requested clients
  ###
  get_users_pre_keys: (user_client_map) ->
    @cryptography_service.get_users_pre_keys user_client_map
    .catch (error) =>
      if error.code is z.service.BackendClientError::STATUS_CODE.NOT_FOUND
        throw new z.user.UserError z.user.UserError::TYPE.PRE_KEY_NOT_FOUND
      else
        @logger.error "Failed to get pre-key from backend: #{error.message}"
        throw new z.user.UserError z.user.UserError::TYPE.REQUEST_FAILURE

  _load_session: (user_id, client_id) ->
    return Promise.resolve()
    .then =>
      session_id = @_construct_session_id user_id, client_id
      return @cryptobox.session_load session_id
      .catch =>
        @get_users_pre_keys({"#{user_id}": [client_id]})
        .then (user_pre_key_map) =>
          remote_pre_key = user_pre_key_map[user_id][client_id]
          return @_session_from_encoded_prekey_payload remote_pre_key, user_id, client_id

  ###
  Generate the signaling keys (which are used for mobile push notifications).
  @note Signaling Keys are unimportant for the webapp (because they are used for iOS or Android push notifications) but required by the backend.
  Thus this method returns a static Signaling Key Pair.
  @private
  @return [Object] Object containing the signaling keys
  ###
  _generate_signaling_keys: ->
    signaling_keys =
      enckey: 'Wuec0oJi9/q9VsgOil9Ds4uhhYwBT+CAUrvi/S9vcz0='
      mackey: 'Wuec0oJi9/q9VsgOil9Ds4uhhYwBT+CAUrvi/S9vcz0='

    return signaling_keys

  ###
  Create a map of all local sessions.
  @return [Object] Object of users each containing an array of local sessions
  ###
  create_user_session_map: =>
    user_session_map = {}
    for session_id, session of @storage_repository.sessions
      ids = z.client.Client.dismantle_user_client_id session_id
      user_session_map[ids.user_id] ?= []
      user_session_map[ids.user_id].push ids.client_id
    return user_session_map

  ###
  Construct a session ID.
  @todo Make public
  @private
  @param user_id [String] User ID for the remote participant
  @param client_id [String] Client ID of the remote participant
  @return [String] Client ID
  ###
  _construct_session_id: (user_id, client_id) ->
    return "#{user_id}@#{client_id}"

  _construct_session_ids: (user_client_map) =>
    session_ids = []

    for user_id, client_ids of user_client_map
      client_ids.forEach (client_id) =>
        session_id = @_construct_session_id user_id, client_id
        session_ids.push session_id

    return session_ids

  delete_session: (user_id, client_id) =>
    session_id = @_construct_session_id user_id, client_id
    return @cryptobox.session_delete session_id

  ###
  Bundles and encrypts the generic message for all given clients.

  @param user_client_map [Object] Contains all users and their known clients
  @param generic_message [z.proto.GenericMessage] Proto buffer message to be encrypted
  @return [Promise] Promise that resolves with the encrypted payload
  ###
  encrypt_generic_message: (user_client_map, generic_message, payload = @_construct_payload @current_client().id) =>
    future_cipher_payloads = []

    for user_id, client_ids of user_client_map
      payload.recipients[user_id] ?= {}
      client_ids.forEach (client_id) =>
        session_id = @_construct_session_id user_id, client_id
        future_cipher_payloads.push @_encrypt_payload_for_session session_id, generic_message

    @logger.log "Encrypting message of type '#{generic_message.content}' for '#{Object.keys(payload.recipients).length}' users.", payload.recipients

    Promise.all future_cipher_payloads
    .then (future_cipher_payloads) =>
      user_client_map_for_missing_sessions = {}

      future_cipher_payloads.forEach ([session_id, ciphertext]) ->
        {user_id, client_id} = z.client.Client.dismantle_user_client_id session_id
        if ciphertext
          payload.recipients[user_id][client_id] = ciphertext
        else
          user_client_map_for_missing_sessions[user_id] ?= []
          user_client_map_for_missing_sessions[user_id].push client_id

      return @_encrypt_generic_message_for_new_sessions user_client_map_for_missing_sessions, generic_message
    .then (additional_cipher_payloads) ->
      additional_cipher_payloads.forEach ([session_id, ciphertext]) ->
        {user_id, client_id} = z.client.Client.dismantle_user_client_id session_id
        payload.recipients[user_id] ?= {}
        payload.recipients[user_id][client_id] = ciphertext
      return payload

  _session_from_encoded_prekey_payload: (remote_pre_key, user_id, client_id) =>
    return Promise.resolve()
    .then =>
      if remote_pre_key
        @logger.log "Initializing session with Client ID '#{client_id}' from User ID '#{user_id}' with remote PreKey ID '#{remote_pre_key.id}'."
        session_id = @_construct_session_id user_id, client_id
        decoded_prekey_bundle_buffer = z.util.base64_to_array(remote_pre_key.key).buffer
        return @cryptobox.session_from_prekey session_id, decoded_prekey_bundle_buffer
      @logger.warn "No remote PreKey for User ID '#{user_id}' with Client ID '#{client_id}' found. The owner probably deleted the client already."
      return undefined
    .catch (error) =>
      @logger.warn "Invalid remote PreKey for User ID '#{user_id}' with Client ID '#{client_id}' found. Skipping encryption. Reason: #{error.message}", error
      return undefined

  _encrypt_generic_message_for_new_sessions: (user_client_map_for_missing_sessions, generic_message) =>
    return new Promise (resolve) =>
      if Object.keys(user_client_map_for_missing_sessions).length
        @get_users_pre_keys user_client_map_for_missing_sessions
        .then (user_pre_key_map) =>
          @logger.info "Fetched pre-keys for '#{Object.keys(user_pre_key_map).length}' users.", user_pre_key_map

          future_sessions = []

          for user_id of user_pre_key_map
            for client_id of user_pre_key_map[user_id]
              remote_pre_key = user_pre_key_map[user_id][client_id]
              future_sessions.push @_session_from_encoded_prekey_payload remote_pre_key, user_id, client_id

          Promise.all future_sessions
          .then (cryptobox_sessions) =>
            future_payloads = []

            for cryptobox_session in cryptobox_sessions when cryptobox_session
              future_payloads.push @_encrypt_payload_for_session cryptobox_session.id, generic_message

            Promise.all(future_payloads).then resolve
      else
        resolve []

  ###
  Construct the payload for an encrypted message.

  @private
  @param sender [String] Client ID of message sender
  @return [Object] Payload to send to backend
  ###
  _construct_payload: (sender) ->
    return {
      sender: sender
      recipients: {}
      native_push: true
    }

  ###
  Encrypt the generic message for a given session.
  @note We created the convention that whenever we fail to encrypt for a specific client, we send a Bomb Emoji (no fun!)

  @private
  @param generic_message [z.proto.GenericMessage] ProtoBuffer message
  @return [String] Encrypted message as BASE64 encoded string
  ###
  _encrypt_payload_for_session: (session_id, generic_message) ->
    return Promise.resolve().then =>
      @cryptobox.encrypt session_id, generic_message.toArrayBuffer()
      .then (ciphertext) ->
        return [session_id, z.util.array_to_base64 ciphertext]
      .catch (error) =>
        if error instanceof cryptobox.store.RecordNotFoundError
          @logger.log "Session '#{session_id}' needs to get initialized..."
          return [session_id, undefined ]
        else
          @logger.warn "Failed encrypting '#{generic_message.content}' message for session '#{session_id}': #{error.message}", error
          return [session_id, @::SYMBOL.SENDER_FAILED_TO_DECRYPT]

  ###
  @return [cryptobox.CryptoboxSession, z.proto.GenericMessage] Cryptobox session along with the decrypted message in ProtocolBuffer format
  ###
  decrypt_event: (event) =>
    if not event.data
      @logger.error "Encrypted event with ID '#{event.id}' does not contain it's data payload", event
      return Promise.reject new z.cryptography.CryptographyError z.cryptography.CryptographyError::TYPE.NO_DATA_CONTENT

    # TODO: Make bomb a constant
    if event.data.text is @::SYMBOL.SENDER_FAILED_TO_DECRYPT
      return Promise.reject new Proteus.errors.DecryptError.InvalidMessage("The sending client ID '#{event.data.sender}' couldn't encrypt a message for our client.")

    session_id = @_construct_session_id event.from, event.data.sender
    ciphertext = z.util.base64_to_array(event.data.text or event.data.key).buffer
    return @cryptobox.decrypt(session_id, ciphertext).then (plaintext) -> z.proto.GenericMessage.decode plaintext
