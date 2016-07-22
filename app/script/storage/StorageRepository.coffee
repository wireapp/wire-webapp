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
z.storage ?= {}

class z.storage.StorageRepository extends cryptobox.CryptoboxStore
  constructor: (@storage_service) ->
    @logger = new z.util.Logger 'z.storage.StorageRepository', z.config.LOGGER.OPTIONS

    @identity = undefined
    @prekeys = {}
    @sessions = {}

    @sessions_handled = 0
    @sessions_promises = []
    @sessions_total = 0
    @sessions_queue = ko.observableArray []

    @sessions_queue.subscribe (sessions) =>
      if sessions.length > 0
        @_deserialize_session @sessions_queue()[0]
        .then (session) =>
          if session
            @logger.log @logger.levels.INFO, "De-serialized session '#{@sessions_queue()[0].id}'", session
          @sessions_handled++
          if @sessions_handled % 5 is 0
            replace = [@sessions_handled, @sessions_total]
            amplify.publish z.event.WebApp.APP.UPDATE_INIT,  z.string.init_sessions_progress, false, replace
          window.setTimeout =>
            @sessions_queue.shift()
          , 0
      else
        @logger.log @logger.levels.INFO, "De-serialized '#{Object.keys(@sessions).length}' sessions", @sessions
        @sessions_promises[0] @sessions


  ###############################################################################
  # Initialization
  ###############################################################################

  ###
  Initialize the repository to setup Cryptobox with the Local Identity Key Pair, Sessions and Pre-Keys.
  @return [Promise] Promise that will resolve with the repository after initialization
  ###
  init: (skip_sessions) =>
    return new Promise (resolve, reject) =>
      @_load_identity()
      .then (@identity) =>
        if @identity
          @logger.log @logger.levels.INFO, 'Loaded local identity key pair from database', @identity
        else
          @logger.log @logger.levels.INFO, 'We did not find a local identity. This is a new client.'
        return @identity
      .then (local_identity) =>
        return {} if not local_identity
        if skip_sessions
          throw new z.storage.SkipError 'Skipped loading of sessions and pre-keys'
        else
          return @_load_sessions()
      .then =>
        return @_load_pre_keys()
      .then =>
        @logger.log @logger.levels.INFO, 'Initialized repository'
        resolve @
      .catch (error) =>
        if error instanceof z.storage.SkipError
          @logger.log "Initialized repository with the following exception: #{error.message}"
          resolve @
        else
          @logger.log @logger.levels.ERROR, "Storage Repository initialization failed: #{error?.message}", error
          reject error

  _deserialize_session: (session) ->
    return Promise.resolve()
    .then =>
      try
        bytes = sodium.from_base64 session.serialised
        @sessions[session.id] = Proteus.session.Session.deserialise @identity, bytes.buffer
        return @sessions[session.id]
      catch error
        @logger.log @logger.levels.ERROR, "Session '#{session.id}' is corrupt.", error
        # TODO: Consider deleting or repairing corrupt data (like broken sessions)
        return undefined

  ###
  Loads the user's identity key pair.
  @private
  @return [Promise] Promise that will resolve with the key pair loaded from storage
  ###
  _load_identity: =>
    return new Promise (resolve, reject) =>
      @storage_service.load @storage_service.OBJECT_STORE_KEYS, 'local_identity'
      .then (identity_key_pair) ->
        if identity_key_pair
          bytes = sodium.from_base64 identity_key_pair.serialised
          resolve Proteus.keys.IdentityKeyPair.deserialise bytes.buffer
        else
          resolve undefined
      .catch (error) =>
        @logger.log @logger.levels.ERROR, "Something failed: #{error?.message}", error
        reject error

  ###
  Returns a dictionary of all de-serialized records in a given object store.

  @note: To be only used with Cryptobox!
  @private
  @return [Promise] Promise that will resolve with the de-serialized pre-keys
  ###
  _load_pre_keys: =>
    return new Promise (resolve, reject) =>
      @storage_service.get_all @storage_service.OBJECT_STORE_PREKEYS
      .then (pre_keys) =>
        @logger.log @logger.levels.INFO, "Loaded '#{pre_keys.length}' pre-keys from database"
        for pre_key in pre_keys
          try
            bytes = sodium.from_base64 pre_key.serialised
            @prekeys[pre_key.id] = Proteus.keys.PreKey.deserialise bytes.buffer
          catch error
            @logger.log @logger.levels.ERROR, "Pre-key with primary key '#{pre_key.id}' is corrupt.", error
            # TODO: Consider deleting or repairing corrupt data (like broken sessions)
        @logger.log @logger.levels.INFO,
          "Initialized '#{Object.keys(@prekeys).length}' pre-keys from database", @prekeys
        resolve @prekeys
      .catch (error) =>
        @logger.log @logger.levels.WARN, "Failed to load pre-keys from storage: #{error.message}", error
        reject error

  _load_sessions: =>
    return new Promise (resolve, reject) =>
      @storage_service.get_all @storage_service.OBJECT_STORE_SESSIONS
      .then (sessions) =>
        @sessions_total = sessions.length
        amplify.publish z.event.WebApp.APP.UPDATE_INIT, z.string.init_sessions_expectation, true, [@sessions_total]
        if @sessions_total > 0
          @logger.log @logger.levels.INFO, "Loaded '#{@sessions_total}' sessions from storage"
          @sessions_queue sessions
          @sessions_promises = [resolve, reject]
        else
          @logger.log @logger.levels.INFO, 'No sessions found in storage'
          resolve @sessions
      .catch (error) =>
        @logger.log @logger.levels.WARN, "Failed to load sessions from storage: #{error.message}", error
        reject error

  ###############################################################################
  # Amplify
  ###############################################################################

  ###
  Get a value for a given primary key from the amplify value store.

  @param primary_key [String] Primary key to retrieve the object for
  @return [Promise] Promise that will resolve with the retrieved value
  ###
  get_value: (primary_key) =>
    return new Promise (resolve, reject) =>
      @storage_service.load @storage_service.OBJECT_STORE_AMPLIFY, primary_key
      .then (record) ->
        if record?.value
          resolve record.value
        else
          reject new Error "Value for primary key '#{primary_key}' not found"
      .catch (error) =>
        @logger.log @logger.levels.ERROR, "Something failed: #{error?.message}", error
        reject error

  ###
  Save a value in the amplify value store.

  @param primary_key [String] Primary key to save the object with
  @param value [value] Object to be stored
  @return [Promise] Promise that will resolve with the saved record
  ###
  save_value: (primary_key, value) =>
    return @storage_service.save @storage_service.OBJECT_STORE_AMPLIFY, primary_key, value: value

  ###
  Closes the database connection.
  ###
  terminate: ->
    @storage_service.terminate()

  ###############################################################################
  # Conversation Events
  ###############################################################################

  ###
  Construct a unique primary key.

  @param conversation_id [String] ID of conversation
  @param sender_id [String] ID of message sender
  @param time [String] Time in ISO format to create timestamp from
  @return [String] Generated primary key
  ###
  construct_primary_key: (conversation_id, sender_id = @storage_service.user_id, time) ->
    timestamp = new Date(time).getTime()
    throw new z.storage.StorageError z.storage.StorageError::INVALID_TIMESTAMP if window.isNaN timestamp
    return "#{conversation_id}@#{sender_id}@#{timestamp}"

  ###
  Save an unencrypted conversation event.

  @param event [Object] JSON event to be stored
  @return [Promise] Promise that resolves with the stored record
  ###
  save_unencrypted_conversation_event: (event) ->
    return new Promise (resolve, reject) =>
      primary_key = @construct_primary_key event.conversation, event.from, event.time

      event_object =
        raw: event
        meta:
          timestamp: new Date(event.time).getTime()
          version: 1

      store_name = @storage_service.OBJECT_STORE_CONVERSATION_EVENTS
      @storage_service.save store_name, primary_key, event_object
      .then (primary_key) -> resolve primary_key
      .catch (error) -> reject error

  ###
  Save a decrypted conversation event.

  @param primary_key [String] Primary key to save the object with
  @param otr_message_event [Object] JSON event to be stored
  @param mapped_json [Object] OTR event mapped to its unencrypted counterpart
  @return [Promise] Promise that resolves with the stored record
  ###
  save_decrypted_conversation_event: (primary_key, otr_message_event, mapped_json) ->
    return new Promise (resolve, reject) =>
      event_object =
        raw: otr_message_event
        meta:
          timestamp: new Date(otr_message_event.time).getTime()
          version: 1
        mapped: mapped_json

      # We don't need to keep ciphertext once it has been successfully decrypted
      event_object.raw.data = undefined

      store_name = @storage_service.OBJECT_STORE_CONVERSATION_EVENTS
      @storage_service.save store_name, primary_key, event_object
      .then (primary_key) -> resolve primary_key
      .catch (error) -> reject error

  ###
  Load a conversation event for a given primary key.

  @param primary_key [String] Primary key to save the object with
  @return [Promise] Promise that resolves with the retrieved record
  ###
  load_event_for_conversation: (primary_key) ->
    return @storage_service.load @storage_service.OBJECT_STORE_CONVERSATION_EVENTS, primary_key

  ###
  Load conversation events by event type.

  @param event_types [Array<Strings>] Array of event types to match
  @return [Promise] Promise that resolves with the retrieved records
  ###
  load_events_by_types: (event_types) ->
    return new Promise (resolve, reject) =>
      @storage_service.db[@storage_service.OBJECT_STORE_CONVERSATION_EVENTS]
      .where 'raw.type'
      .anyOf event_types
      .sortBy 'raw.time'
      .then (records) ->
        resolve records
      .catch (error) =>
        @logger.log @logger.levels.ERROR, "Something failed: #{error?.message}", error
        reject error

  ###############################################################################
  # Identity
  ###############################################################################

  ###
  Load the identity key pair.
  @override
  @return [String] Serialized identity key pair
  ###
  load_identity: ->
    return @identity

  ###
  Save the identity key pair.

  @override
  @param identity [Proteus.keys.IdentityKeyPair]
  @return [Promise] Promise that resolves with the saved record
  ###
  save_identity: (identity) ->
    return new Promise (resolve, reject) =>
      @identity = identity
      payload = serialised: sodium.to_base64 new Uint8Array identity.serialise()

      @storage_service.save @storage_service.OBJECT_STORE_KEYS, 'local_identity', payload
      .then (primary_key) =>
        message = "Saved local identity '#{identity.public_key.fingerprint()}' to db '#{@storage_service.db_name}'"
        @logger.log @logger.levels.INFO, message, identity
        resolve primary_key
      .catch (error) -> reject error


  ###############################################################################
  # Pre-keys
  ###############################################################################

  ###
  Store a pre-key.

  @override
  @param prekey [String] Pre-key to be stored
  @return [Promise] Promise that resolves with the saved record
  ###
  add_prekey: (prekey) ->
    return new Promise (resolve, reject) =>
      @prekeys[prekey.key_id] = prekey
      payload =
        id: prekey.key_id
        serialised: sodium.to_base64 new Uint8Array prekey.serialise()

      @storage_service.save @storage_service.OBJECT_STORE_PREKEYS, "#{prekey.key_id}", payload
      .then (primary_key) -> resolve primary_key
      .catch (error) -> reject error

  ###
  Delete a pre-key

  @override
  @param prekey_id [String] Primary key to delete pre-key from store
  @return [Promise] Promise that resolves with the deleted record
  ###
  delete_prekey: (prekey_id) ->
    return new Promise (resolve, reject) =>
      delete @prekeys[prekey_id]

      @storage_service.delete @storage_service.OBJECT_STORE_PREKEYS, "#{prekey_id}"
      .then (record) -> resolve record
      .catch (error) -> reject error

  ###
  Load a pre-key.

  @override
  @param prekey_id [String] Primary key to retrieve pre-key for
  @return [String] Pre-key
  ###
  load_prekey: (prekey_id) ->
    return @prekeys[prekey_id]

  clear_all_stores: =>
    @storage_service.clear_all_stores()
    .then => @logger.log "Cleared database '#{@storage_service.db_name}'"

  ###############################################################################
  # Sessions
  ###############################################################################

  ###
  Delete a session.

  @override
  @param session_id [String] ID of session to be deleted from store
  @return [Promise] Promise that resolves with the deleted record
  ###
  delete_session: (session_id) ->
    return new Promise (resolve, reject) =>
      delete @sessions[session_id]

      @storage_service.delete @storage_service.OBJECT_STORE_SESSIONS, session_id
      .then (record) -> resolve record
      .catch (error) -> reject error

  ###
  Load a session.

  @override
  @param identity [String] Unused identity
  @param session_id [String] ID of session to be retrieved
  @return [Object] Session
  ###
  load_session: (identity, session_id) ->
    return @sessions[session_id]

  ###
  Save a session.

  @override
  @param session_id [String] ID of session to be stored
  @param session [Object] Session to be stored
  @return [Promise] Promise that resolves with the saved record
  ###
  save_session: (session_id, session) ->
    return new Promise (resolve, reject) =>
      @sessions[session_id] = session
      payload =
        id: session_id
        serialised: sodium.to_base64 new Uint8Array session.serialise()

      @storage_service.save @storage_service.OBJECT_STORE_SESSIONS, session_id, payload
      .then (primary_key) ->
        resolve primary_key
      .catch (error) -> reject error

  ###
  Nuke the database.
  ###
  delete_everything: =>
    @logger.log @logger.levels.WARN, "Deleting database '#{@storage_service.db_name}'"
    return @storage_service.delete_everything()
