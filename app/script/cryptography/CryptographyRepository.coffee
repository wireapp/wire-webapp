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
  ###
  Construct a new Cryptography repository.
  @param cryptography_service [z.cryptography.CryptographyService] Backend REST API cryptography service implementation
  @param storage_repository [z.storage.StorageRepository] Repository for all storage interactions
  ###
  constructor: (@cryptography_service, @storage_repository) ->
    @logger = new z.util.Logger 'z.cryptography.CryptographyRepository', z.config.LOGGER.OPTIONS

    @cryptography_mapper = new z.cryptography.CryptographyMapper()

    @current_client = undefined
    @cryptobox = undefined
    return @


  ###############################################################################
  # Initialization
  ###############################################################################

  ###
  Initialize the repository.
  @return [Promise] Promise that will resolve with the repository after initialization
  ###
  init: (db) =>
    return Promise.resolve()
    .then =>
      @logger.info "Initialize Cryptobox with database...", db
      cryptobox_store = new window.cryptobox.store.IndexedDB db
      @cryptobox = new window.cryptobox.Cryptobox cryptobox_store, 2
      return @cryptobox.init()
    .then =>
      config =
        channel: cryptobox.Cryptobox.prototype.CHANNEL_CRYPTOBOX
        topic: cryptobox.Cryptobox.prototype.TOPIC_NEW_PREKEYS
        callback: (data) =>
          @logger.log "Received '#{data.length}' new PreKeys."
          serialized_prekeys = []
          data.forEach (pre_key) =>
            json_pre_key = @cryptobox.serialize_prekey pre_key
            serialized_prekeys.push json_pre_key
            # TODO: Upload PreKeys to backend

      postal.subscribe config
      return @

  ###############################################################################
  # Pre-keys
  ###############################################################################

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
    session_id = @_construct_session_id user_id, client_id
    @cryptobox.session_load(session_id)
    .catch =>
      return Promise.resolve().then =>
        @get_users_pre_keys({"#{user_id}": [client_id]})
        .then (user_pre_key_map) =>
          remote_pre_key = user_pre_key_map[user_id][client_id]
          @logger.log "Initializing session with Client ID '#{client_id}' from User ID '#{user_id}' with remote PreKey ID '#{remote_pre_key.id}'."
          session_id = @_construct_session_id user_id, client_id
          decoded_prekey_bundle_buffer = bazinga64.Decoder.fromBase64(remote_pre_key.key).asBytes.buffer
          return @cryptobox.session_from_prekey session_id, decoded_prekey_bundle_buffer
    .then (cryptobox_session) ->
      return cryptobox_session.fingerprint_remote()

  ###
  Get a pre-key for a user client.

  @param user_id [String] ID of user
  @param client_id [String] ID of client to request pre-key for
  @return [Promise] Promise that resolves with a pre-key for the client
  ###
  get_user_pre_key: (user_id, client_id) ->
    @cryptography_service.get_user_pre_key user_id, client_id
    .then (response) ->
      return response.prekey
    .catch (error) =>
      if error.code is z.service.BackendClientError::STATUS_CODE.NOT_FOUND
        throw new z.user.UserError z.user.UserError::TYPE.PRE_KEY_NOT_FOUND
      else
        @logger.error "Failed to get pre-key from backend: #{error.message}"
        throw new z.user.UserError z.user.UserError::TYPE.REQUEST_FAILURE

  ###
  Get a pre-key for client of in the user client map.
  @param user_client_map [Object] User client map to request pre-keys for
  @return [Promise] Promise that resolves a map of pre-keys for the requested clients
  ###
  get_users_pre_keys: (user_client_map) ->
    @cryptography_service.get_users_pre_keys user_client_map
    .catch (error) =>
      @logger.error "Failed to get pre-key from backend: #{error.message}"
      throw new z.user.UserError z.user.UserError::TYPE.REQUEST_FAILURE

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


  ###############################################################################
  # Sessions
  ###############################################################################

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

    for user_id, client_ids  of user_client_map
      client_ids.forEach (client_id) =>
        session_id = @_construct_session_id user_id, client_id
        session_ids.push session_id

    return session_ids

  delete_session: (user_id, client_id) =>
    session_id = @_construct_session_id user_id, client_id
    return @cryptobox.session_delete session_id

  ###############################################################################
  # Encryption
  ###############################################################################

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

    z.util.PromiseUtil.execute_all future_cipher_payloads
    .then (future_cipher_payloads) =>
      user_client_map_for_missing_sessions = {}

      future_cipher_payloads.results.forEach (result) ->
        if result.encrypted
          payload.recipients[result.user_id][result.client_id] = result.encrypted
        else
          user_client_map_for_missing_sessions[result.user_id] ?= []
          user_client_map_for_missing_sessions[result.user_id].push result.client_id

      return @_encrypt_generic_message_for_new_sessions user_client_map_for_missing_sessions, generic_message
    .then (additional_cipher_payloads) ->
      additional_cipher_payloads.forEach (result) ->
        payload.recipients[result.user_id] ?= {}
        payload.recipients[result.user_id][result.client_id] = result.encrypted
      return payload

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
              @logger.log "Initializing session with Client ID '#{client_id}' from User ID '#{user_id}' with remote PreKey ID '#{remote_pre_key.id}'."
              session_id = @_construct_session_id user_id, client_id
              decoded_prekey_bundle_buffer = bazinga64.Decoder.fromBase64(remote_pre_key.key).asBytes.buffer
              future_sessions.push @cryptobox.session_from_prekey session_id, decoded_prekey_bundle_buffer

          Promise.all(future_sessions).then (cryptobox_sessions) =>
            future_payloads = []

            for cryptobox_session in cryptobox_sessions
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
      values = z.client.Client.dismantle_user_client_id session_id
      @cryptobox.encrypt session_id, generic_message.toArrayBuffer()
      .then (generic_message_encrypted) ->
        values.encrypted = z.util.array_to_base64 generic_message_encrypted
        return values
      .catch (error) =>
        if error instanceof cryptobox.store.RecordNotFoundError
          @logger.log "Session '#{session_id}' needs to get initialized..."
          return values
        else
          @logger.error "Failed encrypting '#{generic_message.content}' message for session '#{session_id}': #{error.message}", error
          values.encrypted = '💣'
          return values

  ###############################################################################
  # Decryption
  ###############################################################################

  ###
  @return [cryptobox.CryptoboxSession, z.proto.GenericMessage] Cryptobox session along with the decrypted message in ProtocolBuffer format
  ###
  decrypt_event: (event) =>
    return new Promise (resolve, reject) =>
      if not event.data
        @logger.error "Encrypted event with ID '#{event.id}' does not contain it's data payload", event
        reject new z.cryptography.CryptographyError z.cryptography.CryptographyError::TYPE.NO_DATA_CONTENT
        return

      primary_key = z.storage.StorageService.construct_primary_key event
      @storage_repository.load_event_for_conversation primary_key
      .then (loaded_event) =>
        if loaded_event is undefined
          resolve @_decrypt_message event
        else
          @logger.info "Skipped decryption of event '#{event.type}' (#{primary_key}) because it was previously stored"
          reject new z.cryptography.CryptographyError z.cryptography.CryptographyError::TYPE.PREVIOUSLY_STORED
      .catch (decrypt_error) =>
        # Get error information
        receiving_client_id = event.data.recipient
        remote_client_id = event.data.sender
        remote_user_id = event.from

        # Handle error
        if decrypt_error instanceof Proteus.errors.DecryptError.DuplicateMessage or decrypt_error instanceof Proteus.errors.DecryptError.OutdatedMessage
          # We don't need to show duplicate message errors to the user
          return resolve [undefined, undefined]

        else if decrypt_error instanceof Proteus.errors.DecryptError.InvalidMessage or decrypt_error instanceof Proteus.errors.DecryptError.InvalidSignature
          # Session is broken, let's see what's really causing it...
          session_id = @_construct_session_id remote_user_id, remote_client_id
          @logger.error "Session '#{session_id}' broken or out of sync. Reset the session and decryption is likely to work again.\r\n" +
              "Try: wire.app.repository.cryptography.reset_session('#{remote_user_id}', '#{remote_client_id}');"

          if decrypt_error instanceof Proteus.errors.DecryptError.InvalidMessage
            @logger.error "Received message is for client '#{receiving_client_id}' while our ID is '#{@current_client().id}'."

        else if decrypt_error instanceof Proteus.errors.DecryptError.RemoteIdentityChanged
          # Remote identity changed... Is there a man in the middle or do we mess up with clients?
          session = @load_session remote_user_id, remote_client_id
          remote_fingerprint = session.session.remote_identity.public_key.fingerprint()

          message = "Fingerprints do not match: We expect this fingerprint '#{remote_fingerprint}' from user ID '#{remote_user_id}' with client ID '#{remote_client_id}'"
          @logger.error message, session

        # Show error in JS console
        @logger.error "Decryption of '#{event.type}' (#{primary_key}) failed: #{decrypt_error.message}",
          error: decrypt_error,
          event: event

        # Report error to Localytics and Raygun
        hashed_error_message = z.util.murmurhash3 decrypt_error.message, 42
        error_code = hashed_error_message.toString().substr 0, 4
        @_report_decrypt_error event, decrypt_error, error_code

        unable_to_decrypt_event =
          conversation: event.conversation
          id: z.util.create_random_uuid()
          type: z.event.Client.CONVERSATION.UNABLE_TO_DECRYPT
          from: remote_user_id
          time: event.time
          error: "#{decrypt_error.message} (#{remote_client_id})"
          error_code: "#{error_code} (#{remote_client_id})"

        # Show error message in message view
        amplify.publish z.event.WebApp.EVENT.INJECT, unable_to_decrypt_event

        resolve [undefined, undefined]

  ###
  Save an unencrypted event.
  @param event [Object] JSON of unencrypted backend event
  @return [Promise] Promise that will resolve with the saved record
  ###
  save_unencrypted_event: (event) ->
    Promise.resolve().then =>
      event.category = z.message.MessageCategorization.category_from_event event
      @storage_repository.save_conversation_event event
    .catch (error) =>
      @logger.error "Saving unencrypted message failed: #{error.message}", error
      throw error

  ###
  @return [z.proto.GenericMessage] Decrypted message in ProtocolBuffer format
  ###
  _decrypt_message: (event) =>
    session_id = @_construct_session_id event.from, event.data.sender

    ciphertext = event.data.text or event.data.key
    msg_bytes = bazinga64.Decoder.fromBase64(ciphertext).asBytes.buffer

    return @cryptobox.decrypt session_id, msg_bytes
    .then (decrypted_message) ->
      return z.proto.GenericMessage.decode decrypted_message

  ###
  Report decryption error to Localytics and stack traces to Raygun.
  @note We currently do not want to report duplicate message errors.
  ###
  _report_decrypt_error: (event, decrypt_error, error_code) =>
    remote_client_id = event.data.sender
    remote_user_id = event.from
    session_id = @_construct_session_id remote_user_id, remote_client_id

    attributes =
      cause: "#{error_code}: #{decrypt_error.message}"
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.E2EE.CANNOT_DECRYPT_MESSAGE, attributes

    if decrypt_error not instanceof Proteus.errors.DecryptError.DuplicateMessage and decrypt_error not instanceof Proteus.errors.DecryptError.TooDistantFuture
      custom_data =
        client_local_class: @current_client().class
        client_local_type: @current_client().type
        error_code: error_code
        event_type: event.type
        session_id: session_id

      raygun_error = new Error "Decryption failed: #{decrypt_error.message}"
      raygun_error.stack = decrypt_error.stack
      Raygun.send raygun_error, custom_data
