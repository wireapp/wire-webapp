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
  init: =>
    return Promise.resolve()
    .then =>
      @logger.log @logger.levels.INFO, "Initialize Cryptobox with our storage repository on '#{@storage_repository.storage_service.db_name}'", @storage_repository
      @cryptobox = new cryptobox.Cryptobox @storage_repository
      @logger.log @logger.levels.INFO, 'Initialized repository'
      return @


  ###############################################################################
  # Pre-keys
  ###############################################################################

  ###
  Generate all keys need for client registration.
  @return [Promise] Promise that resolves with an array of last resort key, pre-keys, and signaling keys
  ###
  generate_client_keys: =>
    return new Promise (resolve, reject) =>
      last_resort_key = undefined
      pre_keys = undefined
      signaling_keys = undefined

      @_generate_last_resort_key()
      .then (key) =>
        last_resort_key = key
        @logger.log @logger.levels.INFO, 'Generated last resort key', last_resort_key
        return @_generate_pre_keys()
      .then (keys) =>
        pre_keys = keys
        @logger.log @logger.levels.INFO, "Number of generated pre-keys: #{pre_keys.length}", pre_keys
        return @_generate_signaling_keys()
      .then (keys) =>
        signaling_keys = keys
        @logger.log @logger.levels.INFO, 'Generated signaling keys', signaling_keys
        resolve [last_resort_key, pre_keys, signaling_keys]
      .catch (error) =>
        @logger.log @logger.levels.ERROR, "Failed to generate client keys: #{error.message}", error
        reject error

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
        @logger.log @logger.levels.ERROR, "Failed to get pre-key from backend: #{error.message}"
        throw new z.user.UserError z.user.UserError::TYPE.REQUEST_FAILURE

  ###
  Get a pre-key for client of in the user client map.
  @param user_client_map [Object] User client map to request pre-keys for
  @return [Promise] Promise that resolves a map of pre-keys for the requested clients
  ###
  get_users_pre_keys: (user_client_map) ->
    @cryptography_service.get_users_pre_keys user_client_map
    .then (response) ->
      return response
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Failed to get pre-key from backend: #{error.message}"
      throw new z.user.UserError z.user.UserError::TYPE.REQUEST_FAILURE

  ###
  Construct the pre-key.

  @private
  @param id [String] ID of pre-key to be constructed
  @return [Promise} Promise that will resolve with the new pre-key as object
  ###
  _construct_pre_key_promise: (id) =>
    @cryptobox.new_prekey id
    .then (pre_key_bundle) ->
      pre_key_model =
        id: id
        key: z.util.array_to_base64 pre_key_bundle
      return pre_key_model

  ###
  Construct the last resort pre-key.
  @private
  @return [Promise} Promise that will resolve with the new pre-key as object
  ###
  _generate_last_resort_key: =>
    return @_construct_pre_key_promise Proteus.keys.PreKey.MAX_PREKEY_ID

  ###
  Generate the pre-keys.

  @private
  @return [Promise} Promise that will resolve with an arrays of all the generated new pre-keys as object
  ###
  _generate_pre_keys: =>
    return Promise.all (@_construct_pre_key_promise i for i in [0...1])

  ###
  Generate the signaling keys

  @private
  @return [Object] Object containing the signaling keys
  ###
  _generate_signaling_keys: ->
    random_bytes = new Uint8Array sodium.crypto_auth_hmacsha256_KEYBYTES
    crypto.getRandomValues random_bytes

    hmac = sodium.crypto_auth_hmacsha256 random_bytes, sodium.crypto_hash_sha256 'salt'
    encryption_key = sodium.to_base64 hmac
    mac_key = sodium.to_base64 hmac

    signaling_keys =
      enckey: encryption_key
      mackey: mac_key

    return signaling_keys


  ###############################################################################
  # Sessions
  ###############################################################################

  ###
  Deletes a session.

  @param user_id [String] User ID of our chat partner
  @param client_id [String] Client ID of our chat partner
  @return [Promise] Promise that will resolve with the ID of the reset session
  ###
  delete_session: (user_id, client_id) =>
    return Promise.resolve()
    .then =>
      cryptobox_session = @load_session user_id, client_id

      if cryptobox_session
        @logger.log @logger.levels.INFO, "Deleting session for client '#{client_id}' of user '#{user_id}'", cryptobox_session
        @cryptobox.session_delete cryptobox_session.id
        .then -> return cryptobox_session.id
      else
        @logger.log @logger.levels.INFO, "We cannot delete the session for client '#{client_id}' of user '#{user_id}' because it was not found"
        return undefined

  ###
  Get session.
  @param user_id [String] User ID
  @param client_id [String] ID of client to retrieve session for
  @return [Promise<cryptobox.CryptoboxSession>] Promise that resolves with the session
  ###
  get_session: (user_id, client_id) ->
    return Promise.resolve()
    .then =>
      return @load_session(user_id, client_id) or @_initiate_new_session user_id, client_id
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Failed to get session for client '#{client_id}' of user '#{user_id}': #{error.message}", error

  ###
  Get sessions.
  @param user_client_map [Object] User client map to get sessions for
  @return [Promise<Array<cryptobox.CryptoboxSession>>] Promise that resolves with an array of sessions
  ###
  get_sessions: (user_client_map) =>
    return new Promise (resolve, reject) =>
      [cryptobox_session_map, missing_session_map] = @_get_sessions_local user_client_map
      @logger.log @logger.levels.INFO, "Found local sessions for '#{Object.keys(cryptobox_session_map).length}' users", cryptobox_session_map

      @_get_sessions_missing cryptobox_session_map, missing_session_map
      .then (cryptobox_session_map) ->
        resolve cryptobox_session_map
      .catch (error) =>
        @logger.log @logger.levels.ERROR, "Failed to get sessions: #{error.message}", [error, user_client_map]
        reject error

  ###
  Loads the session from Cryptobox.

  @param user_id [String] ID of user
  @param client_id [String] ID of client to retrieve session for
  @return [cryptobox.CryptoboxSession] Retrieved session
  ###
  load_session: (user_id, client_id) =>
    session_id = @_construct_session_id user_id, client_id
    return @cryptobox.session_load session_id

  ###
  Save a session.
  @note Sessions MUST be saved AFTER encrypting messages, but BEFORE sending the encrypted message across the network.
  @param session [cryptobox.CryptoboxSession] Session to be saved
  ###
  save_session: (cryptobox_session) =>
    @logger.log @logger.levels.INFO, "Persisting session '#{cryptobox_session.id}'", cryptobox_session
    return @cryptobox.session_save cryptobox_session

  ###
  Save sessions.
  @param session [Array<cryptobox.CryptoboxSession>] Array of sessions to be saved
  ###
  save_sessions: (cryptobox_sessions) =>
    cryptobox_sessions.forEach (cryptobox_session) => @save_session cryptobox_session

  ###
  Construct a session ID.

  @private
  @param user_id [String] User ID for the remote participant
  @param client_id [String] Client ID of the remote participant
  @return [String] Client ID
  ###
  _construct_session_id: (user_id, client_id) ->
    return "#{user_id}@#{client_id}"

  ###
  Get local session for a user client map.

  @private
  @param user_client_map [Object] User client map
  @return [Array<Object, Object>] An array containing two user client maps. The first contains the found sessions.
  ###
  _get_sessions_local: (user_client_map) ->
    cryptobox_session_map = {}
    missing_session_map = {}
    for user_id, client_ids of user_client_map
      cryptobox_session_map[user_id] = {}
      for client_id in client_ids
        session = @load_session user_id, client_id

        if session
          cryptobox_session_map[user_id][client_id] = session
        else
          missing_session_map[user_id] ?= []
          missing_session_map[user_id].push client_id
    return [cryptobox_session_map, missing_session_map]

  ###
  Get missing session for a user client map.

  @private
  @param user_client_map [Object] User client map
  @param missing_session_map [Object] Client session map
  @return [Promise] Promise that resolves with a client session map
  ###
  _get_sessions_missing: (cryptobox_session_map, missing_session_map) ->
    if Object.keys(missing_session_map).length > 0
      @logger.log @logger.levels.INFO, "Missing sessions for '#{Object.keys(missing_session_map).length}' users", missing_session_map
      return @_initiate_new_sessions cryptobox_session_map, missing_session_map
    else
      return Promise.resolve cryptobox_session_map

  ###
  Initiate a new session for a given client.

  @private
  @param user_id [String] User ID for the remote participant
  @param client_id [String] Client ID of the remote participant
  @return [Promise<cryptobox.CryptoboxSession>] Promise that resolves with the new session
  ###
  _initiate_new_session: (user_id, client_id) ->
    @get_user_pre_key user_id, client_id
    .then (pre_key) =>
      return @_session_from_prekey user_id, client_id, pre_key.key
    .catch (error) =>
      switch error.type
        when z.user.UserError::TYPE.PRE_KEY_NOT_FOUND
          amplify.publish z.event.WebApp.CLIENT.REMOVE, user_id, client_id
        when z.user.UserError::TYPE.REQUEST_FAILURE
          @logger.log @logger.levels.WARN, "Failed to request pre-key for client '#{client_id}' of user '#{user_id}'': #{error.message}", error
        else
          @logger.log @logger.levels.ERROR, "Failed to initialize session from pre-key for client '#{client_id}' of user '#{user_id}': #{error.message}", error
      return undefined

  ###
  Initiate new sessions for a given map.

  @private
  @param cryptobox_session_map [Object] User client map of containing the known sessions
  @param user_client_map [Object] User client map of missing sessions
  @return [Promise] Promise that resolves with a user client map containing the new sessions
  ###
  _initiate_new_sessions: (cryptobox_session_map, user_client_map) ->
    @get_users_pre_keys user_client_map
    .then (user_pre_key_map) =>
      @logger.log @logger.levels.INFO, "Fetched pre-keys for '#{Object.keys(user_pre_key_map).length}' users", user_pre_key_map
      for user_id, client_pre_keys of user_pre_key_map
        cryptobox_session_map[user_id] ?= {}
        for client_id, pre_key of client_pre_keys
          if pre_key
            try
              cryptobox_session_map[user_id][client_id] = @_session_from_prekey user_id, client_id, pre_key.key
            catch error
              @logger.log @logger.levels.ERROR, "Problem initiating a session for client ID '#{client_id}' from user ID '#{user_id}': #{error.message} — Skipping session.", error
          else
            amplify.publish z.event.WebApp.CLIENT.REMOVE, user_id, client_id
      return cryptobox_session_map
    .catch (error) =>
      if error.type is z.user.UserError::TYPE.REQUEST_FAILURE
        @logger.log @logger.levels.WARN, "Failed to request pre-keys for user '#{user_id}'': #{error.message}", error
      throw error

  ###
  Create a session from a message.
  @private
  @param user_id [String] User ID
  @param client_id [String] ID of client to initialize session for
  @param message [ArrayBuffer] Serialised OTR message
  @return [cryptobox.CryptoboxSession] New cryptography session
  ###
  _session_from_message: (user_id, client_id, message) =>
    session_id = @_construct_session_id user_id, client_id
    cryptobox_session = @cryptobox.session_from_message session_id, message
    return cryptobox_session

  ###
  Create a session from a pre-key.
  @private
  @param user_id [String] User ID
  @param client_id [String] ID of client to initialize session for
  @param serialized_pre_key_bundle [String] Base 64-encoded and serialized pre-key bundle
  @return [cryptobox.CryptoboxSession] New cryptography session
  ###
  _session_from_prekey: (user_id, client_id, encoded_pre_key_bundle) =>
    decoded_pre_key_bundle = sodium.from_base64 encoded_pre_key_bundle
    session_id = @_construct_session_id user_id, client_id
    cryptobox_session = @cryptobox.session_from_prekey session_id, decoded_pre_key_bundle.buffer
    return cryptobox_session


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
    @get_sessions user_client_map
    .then (cryptobox_session_map) =>
      return @_add_payload_recipients payload, generic_message, cryptobox_session_map

  ###
  Add the encrypted message for recipients to the payload message.

  @private
  @param payload [Object] Payload to add encrypted message for recipients to
  @param cryptobox_sessions [Array<cryptobox.CryptoboxSession>] Sessions for all the recipients of message
  @param generic_message [z.proto.GenericMessage] ProtoBuffer message to be send
  @return [Object] Payload to send to backend
  ###
  _add_payload_recipients: (payload, generic_message, cryptobox_session_map) ->
    for user_id, client_session_map of cryptobox_session_map
      payload.recipients[user_id] ?= {}
      for client_id, cryptobox_session of client_session_map
        payload.recipients[user_id][client_id] = @_encrypt_payload_for_session cryptobox_session, generic_message
    return payload

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
  @note We created the convention that whenever we fail to encrypt for a specific client, we send a bomb emoji (no fun!)

  @private
  @param cryptobox_session [cryptobox.CryptoboxSession] Cryptographic session
  @param generic_message [z.proto.GenericMessage] ProtoBuffer message
  @return [String] Encrypted message as BASE64 encoded string
  ###
  _encrypt_payload_for_session: (cryptobox_session, generic_message) ->
    try
      generic_message_encrypted = cryptobox_session.encrypt generic_message.toArrayBuffer()
      generic_message_encrypted_base64 = z.util.array_to_base64 generic_message_encrypted
      @save_session cryptobox_session
      return generic_message_encrypted_base64
    catch error
      ids = z.client.Client.dismantle_user_client_id cryptobox_session.id
      # Note: We created the convention that whenever we fail to encrypt for a specific client, we send a bomb emoji (no fun!)
      @logger.log @logger.levels.ERROR,
        "Could not encrypt OTR message of type '#{generic_message.content}' for user ID '#{ids.user_id}' with client ID '#{ids.client_id}': #{error.message}", error
      return '💣'


  ###############################################################################
  # Decryption
  ###############################################################################

  ###
  @return [cryptobox.CryptoboxSession, z.proto.GenericMessage] Cryptobox session along with the decrypted message in ProtocolBuffer format
  ###
  decrypt_event: (event) =>
    return new Promise (resolve, reject) =>
      if not event.data
        @logger.log @logger.levels.ERROR, "Encrypted event with ID '#{event.id}' does not contain its data payload", event
        reject new z.cryptography.CryptographyError z.cryptography.CryptographyError::TYPE.NO_DATA_CONTENT
        return

      if event.type is z.event.Backend.CONVERSATION.OTR_ASSET_ADD
        ciphertext = event.data.key
      else if event.type is z.event.Backend.CONVERSATION.OTR_MESSAGE_ADD
        ciphertext = event.data.text

      primary_key = z.storage.StorageService.construct_primary_key event
      @storage_repository.load_event_for_conversation primary_key
      .then (loaded_event) =>
        if loaded_event is undefined
          resolve @_decrypt_message event, ciphertext
        else
          @logger.log @logger.levels.INFO, "Skipped decryption of event '#{event.type}' (#{primary_key}) because it was previously stored"
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
          @logger.log @logger.levels.ERROR,
            "Session '#{session_id}' broken or out of sync. Reset the session and decryption is likely to work again.\r\n" +
              "Try: wire.app.repository.cryptography.reset_session('#{remote_user_id}', '#{remote_client_id}');"

          if decrypt_error instanceof Proteus.errors.DecryptError.InvalidMessage
            @logger.log @logger.levels.ERROR,
              "Message is for client ID '#{receiving_client_id}' and we have client ID '#{@current_client().id}'."

        else if decrypt_error instanceof Proteus.errors.DecryptError.RemoteIdentityChanged
          # Remote identity changed... Is there a man in the middle or do we mess up with clients?
          session = @load_session remote_user_id, remote_client_id
          remote_fingerprint = session.session.remote_identity.public_key.fingerprint()

          message = "Fingerprints do not match: We expect this fingerprint '#{remote_fingerprint}' from user ID '#{remote_user_id}' with client ID '#{remote_client_id}'"
          @logger.log @logger.levels.ERROR, message, session

        # Show error in JS console
        @logger.log @logger.levels.ERROR,
          "Decryption of '#{event.type}' (#{primary_key}) failed: #{decrypt_error.message}", {
            error: decrypt_error,
            event: event
          }

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
  Save an encrypted event.

  @note IMPORTANT:
    Session should only be saved after the plaintext is saved somewhere safe, as, after saving,
    the session will be unable to decrypt the message again.

  @param generic_message [z.proto.GenericMessage] Received ProtoBuffer message
  @param event [JSON] JSON of 'z.event.Backend.CONVERSATION.OTR-ASSET-ADD' or 'z.event.Backend.CONVERSATION.OTR-MESSAGE-ADD' event
  @return [Promise] Promise that will resolve with the saved record
  ###
  save_encrypted_event: (generic_message, event) =>
    @cryptography_mapper.map_generic_message generic_message, event
    .then (mapped) =>
      return @storage_repository.save_conversation_event mapped
    .catch (error) =>
      if error instanceof z.cryptography.CryptographyError
        return undefined
      else
        @logger.log @logger.levels.ERROR, "Saving encrypted message failed: #{error.message}", error
        throw error

  ###
  Save an unencrypted event.
  @param event [Object] JSON of unencrypted backend event
  @return [Promise] Promise that will resolve with the saved record
  ###
  save_unencrypted_event: (event) ->
    @storage_repository.save_conversation_event event
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Saving unencrypted message failed: #{error.message}", error
      throw error

  ###
  @return [z.proto.GenericMessage] Decrypted message in ProtocolBuffer format
  ###
  _decrypt_message: (event, ciphertext) =>
    user_id = event.from
    client_id = event.data.sender

    session = @load_session user_id, client_id
    msg_bytes = sodium.from_base64(ciphertext).buffer

    decrypted_message = undefined

    if session
      decrypted_message = session.decrypt msg_bytes
    else
      [session, decrypted_message] = @_session_from_message user_id, client_id, msg_bytes

    generic_message = z.proto.GenericMessage.decode decrypted_message
    @save_session session
    return generic_message

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
