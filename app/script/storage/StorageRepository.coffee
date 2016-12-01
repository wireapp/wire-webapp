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
    return @_load_identity()
    .then (@identity) =>
      if @identity
        @logger.log @logger.levels.INFO, 'Loaded local identity key pair from database', @identity
      else
        @logger.log @logger.levels.INFO, 'We did not find a local identity. This is a new client.'
      return @identity
    .then (local_identity) =>
      return {} if not local_identity
      if skip_sessions
        throw new z.storage.StorageError z.storage.StorageError::TYPE.SKIP_LOADING
      return @_load_sessions()
    .then =>
      return @_load_pre_keys()
    .then =>
      @logger.log @logger.levels.INFO, 'Initialized repository'
    .catch (error) =>
      if error.type is z.storage.StorageError::TYPE.SKIP_LOADING
        @logger.log "Initialized repository with the following exception: #{error.message}"
      else
        @logger.log @logger.levels.ERROR, "Storage Repository initialization failed: #{error?.message}", error
        throw error

  _deserialize_session: (session) ->
    return Promise.resolve()
    .then =>
      bytes = sodium.from_base64 session.serialised
      @sessions[session.id] = Proteus.session.Session.deserialise @identity, bytes.buffer
      return @sessions[session.id]
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Session '#{session.id}' is corrupt.", error
      # TODO: Consider deleting or repairing corrupt data (like broken sessions)

  ###
  Loads the user's identity key pair.
  @private
  @return [Promise] Promise that will resolve with the key pair loaded from storage
  ###
  _load_identity: =>
    return @storage_service.load @storage_service.OBJECT_STORE_KEYS, 'local_identity'
    .then (identity_key_pair) ->
      if identity_key_pair
        bytes = sodium.from_base64 identity_key_pair.serialised
        return Proteus.keys.IdentityKeyPair.deserialise bytes.buffer

  ###
  Returns a dictionary of all de-serialized records in a given object store.

  @note: To be only used with Cryptobox!
  @private
  @return [Promise] Promise that will resolve with the de-serialized pre-keys
  ###
  _load_pre_keys: =>
    return @storage_service.get_all @storage_service.OBJECT_STORE_PREKEYS
    .then (pre_keys) =>
      @logger.log @logger.levels.INFO, "Loaded '#{pre_keys.length}' pre-keys from database"
      for pre_key in pre_keys
        try
          bytes = sodium.from_base64 pre_key.serialised
          @prekeys[pre_key.id] = Proteus.keys.PreKey.deserialise bytes.buffer
        catch error
          @logger.log @logger.levels.ERROR, "Pre-key with primary key '#{pre_key.id}' is corrupt.", error
          # TODO: Consider deleting or repairing corrupt data (like broken sessions)
      @logger.log @logger.levels.INFO, "Initialized '#{Object.keys(@prekeys).length}' pre-keys from database", @prekeys
      return @prekeys
    .catch (error) ->
      throw new Error "Failed to load pre-keys from storage: #{error.message}"

  ###
  Loads all sessions.
  @private
  @return [Promise] Promise that will resolve with the loaded sessions
  ###
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
    return @storage_service.load @storage_service.OBJECT_STORE_AMPLIFY, primary_key
    .then (record) ->
      if record?.value
        return record.value
      throw new Error "Value for primary key '#{primary_key}' not found"

  ###
  Save a value in the amplify value store.

  @param primary_key [String] Primary key to save the object with
  @param value [value] Object to be stored
  @return [Promise] Promise that will resolve with the saved record's key
  ###
  save_value: (primary_key, value) =>
    return @storage_service.save @storage_service.OBJECT_STORE_AMPLIFY, primary_key, value: value

  ###
  Closes the database connection.
  @param reason [String] Cause for the termination
  ###
  terminate: (reason) ->
    @storage_service.terminate reason

  ###############################################################################
  # Conversation Events
  ###############################################################################

  ###
  Save an unencrypted conversation event.
  @param event [Object] JSON event to be stored
  @return [Promise] Promise that resolves with the stored record
  ###
  save_conversation_event: (event) ->
    return Promise.resolve().then =>
      primary_key = z.storage.StorageService.construct_primary_key event
      @storage_service.save(@storage_service.OBJECT_STORE_CONVERSATION_EVENTS, primary_key, event).then -> event

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
    return @storage_service.db[@storage_service.OBJECT_STORE_CONVERSATION_EVENTS]
    .where 'type'
    .anyOf event_types
    .sortBy 'time'

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
    return Promise.resolve().then =>
      @identity = identity
      @storage_service.save @storage_service.OBJECT_STORE_KEYS, 'local_identity',
        serialised: sodium.to_base64 new Uint8Array identity.serialise()

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
    return Promise.resolve().then =>
      @prekeys[prekey.key_id] = prekey
      @storage_service.save @storage_service.OBJECT_STORE_PREKEYS, "#{prekey.key_id}",
        id: prekey.key_id
        serialised: sodium.to_base64 new Uint8Array prekey.serialise()

  ###
  Delete a pre-key

  @override
  @param prekey_id [String] Primary key to delete pre-key from store
  @return [Promise] Promise that resolves with the deleted record
  ###
  delete_prekey: (prekey_id) ->
    delete @prekeys[prekey_id]
    return @storage_service.delete @storage_service.OBJECT_STORE_PREKEYS, "#{prekey_id}"

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
    delete @sessions[session_id]
    return @storage_service.delete @storage_service.OBJECT_STORE_SESSIONS, session_id

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
    return Promise.resolve().then =>
      @sessions[session_id] = session
      @storage_service.save @storage_service.OBJECT_STORE_SESSIONS, session_id,
        id: session_id
        serialised: sodium.to_base64 new Uint8Array session.serialise()

  ###
  Nuke the database.
  ###
  delete_everything: =>
    @logger.log @logger.levels.WARN, "Deleting database '#{@storage_service.db_name}'"
    return @storage_service.delete_everything()
