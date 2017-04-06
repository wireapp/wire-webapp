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

###
Base class for persistent storage.
###
class z.storage.StorageService
  OBJECT_STORE_AMPLIFY: 'amplify'
  OBJECT_STORE_CLIENTS: 'clients'
  OBJECT_STORE_CONVERSATION_EVENTS: 'conversation_events'
  OBJECT_STORE_CONVERSATIONS: 'conversations'
  OBJECT_STORE_EVENTS: 'events'
  OBJECT_STORE_KEYS: 'keys'
  OBJECT_STORE_PREKEYS: 'prekeys'
  OBJECT_STORE_SESSIONS: 'sessions'

  constructor: ->
    @logger = new z.util.Logger 'z.storage.StorageService', z.config.LOGGER.OPTIONS

    @db = undefined
    @db_name = undefined
    @user_id = undefined

    return @

  ###############################################################################
  # Initialization
  ###############################################################################

  ###
  Initialize the IndexedDB for a user.

  @param user_id [String] User ID
  @return [Promise] Promise that will resolve with the database name
  ###
  init: (user_id = @user_id) =>
    return new Promise (resolve, reject) =>
      is_permanent = z.util.StorageUtil.get_value z.storage.StorageKey.AUTH.PERSIST
      client_type = if is_permanent then z.client.ClientType.PERMANENT else z.client.ClientType.TEMPORARY

      @user_id = user_id
      @db_name = "wire@#{z.util.Environment.backend.current}@#{user_id}@#{client_type}"

      # https://github.com/dfahlander/Dexie.js/wiki/Version.stores()
      version_1 =
        "#{@OBJECT_STORE_AMPLIFY}": ''
        "#{@OBJECT_STORE_CLIENTS}": ''
        "#{@OBJECT_STORE_CONVERSATION_EVENTS}": ', raw.conversation, raw.time, meta.timestamp'
        "#{@OBJECT_STORE_KEYS}": ''
        "#{@OBJECT_STORE_PREKEYS}": ''
        "#{@OBJECT_STORE_SESSIONS}": ''

      version_2 =
        "#{@OBJECT_STORE_AMPLIFY}": ''
        "#{@OBJECT_STORE_CLIENTS}": ''
        "#{@OBJECT_STORE_CONVERSATION_EVENTS}": ', raw.conversation, raw.time, raw.type, meta.timestamp'
        "#{@OBJECT_STORE_KEYS}": ''
        "#{@OBJECT_STORE_PREKEYS}": ''
        "#{@OBJECT_STORE_SESSIONS}": ''

      version_3 =
        "#{@OBJECT_STORE_AMPLIFY}": ''
        "#{@OBJECT_STORE_CLIENTS}": ''
        "#{@OBJECT_STORE_CONVERSATION_EVENTS}": ', raw.conversation, raw.time, raw.type, meta.timestamp'
        "#{@OBJECT_STORE_CONVERSATIONS}": ', id, last_event_timestamp'
        "#{@OBJECT_STORE_KEYS}": ''
        "#{@OBJECT_STORE_PREKEYS}": ''
        "#{@OBJECT_STORE_SESSIONS}": ''

      version_4 =
        "#{@OBJECT_STORE_AMPLIFY}": ''
        "#{@OBJECT_STORE_CLIENTS}": ', meta.primary_key'
        "#{@OBJECT_STORE_CONVERSATION_EVENTS}": ', raw.conversation, raw.time, raw.type, meta.timestamp'
        "#{@OBJECT_STORE_CONVERSATIONS}": ', id, last_event_timestamp'
        "#{@OBJECT_STORE_KEYS}": ''
        "#{@OBJECT_STORE_PREKEYS}": ''
        "#{@OBJECT_STORE_SESSIONS}": ''

      version_5 =
        "#{@OBJECT_STORE_AMPLIFY}": ''
        "#{@OBJECT_STORE_CLIENTS}": ', meta.primary_key'
        "#{@OBJECT_STORE_CONVERSATION_EVENTS}": ', conversation, time, type'
        "#{@OBJECT_STORE_CONVERSATIONS}": ', id, last_event_timestamp'
        "#{@OBJECT_STORE_KEYS}": ''
        "#{@OBJECT_STORE_PREKEYS}": ''
        "#{@OBJECT_STORE_SESSIONS}": ''

      version_9 =
        "#{@OBJECT_STORE_AMPLIFY}": ''
        "#{@OBJECT_STORE_CLIENTS}": ', meta.primary_key'
        "#{@OBJECT_STORE_CONVERSATION_EVENTS}": ', conversation, time, type, [conversation+time]'
        "#{@OBJECT_STORE_CONVERSATIONS}": ', id, last_event_timestamp'
        "#{@OBJECT_STORE_KEYS}": ''
        "#{@OBJECT_STORE_PREKEYS}": ''
        "#{@OBJECT_STORE_SESSIONS}": ''

      version_10 =
        "#{@OBJECT_STORE_AMPLIFY}": ''
        "#{@OBJECT_STORE_CLIENTS}": ', meta.primary_key'
        "#{@OBJECT_STORE_CONVERSATION_EVENTS}": ', category, conversation, time, type, [conversation+time], [conversation+category]'
        "#{@OBJECT_STORE_CONVERSATIONS}": ', id, last_event_timestamp'
        "#{@OBJECT_STORE_KEYS}": ''
        "#{@OBJECT_STORE_PREKEYS}": ''
        "#{@OBJECT_STORE_SESSIONS}": ''

      version_11 =
        "#{@OBJECT_STORE_AMPLIFY}": ''
        "#{@OBJECT_STORE_CLIENTS}": ', meta.primary_key'
        "#{@OBJECT_STORE_CONVERSATION_EVENTS}": ', category, conversation, time, type, [conversation+time], [conversation+category]'
        "#{@OBJECT_STORE_CONVERSATIONS}": ', id, last_event_timestamp'
        "#{@OBJECT_STORE_KEYS}": ''
        "#{@OBJECT_STORE_PREKEYS}": ''
        "#{@OBJECT_STORE_SESSIONS}": ''

      version_12 =
        "#{@OBJECT_STORE_AMPLIFY}": ''
        "#{@OBJECT_STORE_CLIENTS}": ', meta.primary_key'
        "#{@OBJECT_STORE_CONVERSATION_EVENTS}": ', category, conversation, time, type, [conversation+time], [conversation+category]'
        "#{@OBJECT_STORE_CONVERSATIONS}": ', id, last_event_timestamp'
        "#{@OBJECT_STORE_EVENTS}": '++primary_key, id, category, conversation, time, type, [conversation+time], [conversation+category]'
        "#{@OBJECT_STORE_KEYS}": ''
        "#{@OBJECT_STORE_PREKEYS}": ''
        "#{@OBJECT_STORE_SESSIONS}": ''

      @db = new Dexie @db_name

      @db.on 'blocked', =>
        @logger.error 'Database is blocked'

      # @see https://github.com/dfahlander/Dexie.js/wiki/Version.upgrade()
      # @see https://github.com/dfahlander/Dexie.js/wiki/WriteableCollection.modify()
      @db.version(1).stores version_1
      @db.version(2).stores version_2
      @db.version(3).stores version_3
      @db.version(4).stores version_4
      .upgrade (transaction) =>
        @logger.warn 'Database upgrade to version 4', transaction
        transaction[@OBJECT_STORE_CLIENTS].toCollection().modify (client) ->
          client.meta =
            is_verified: true
            primary_key: 'local_identity'
      @db.version(5).stores version_4
      @db.version(6).stores version_4
      .upgrade (transaction) =>
        @logger.warn 'Database upgrade to version 6', transaction
        transaction[@OBJECT_STORE_CONVERSATIONS].toCollection().eachKey (key) =>
          @db[@OBJECT_STORE_CONVERSATIONS].update key, {id: key}
        transaction[@OBJECT_STORE_SESSIONS].toCollection().eachKey (key) =>
          @db[@OBJECT_STORE_SESSIONS].update key, {id: key}
        transaction[@OBJECT_STORE_PREKEYS].toCollection().eachKey (key) =>
          @db[@OBJECT_STORE_PREKEYS].update key, {id: key}
      @db.version(7).stores version_5
      .upgrade (transaction) =>
        @logger.warn 'Database upgrade to version 7', transaction
        transaction[@OBJECT_STORE_CONVERSATION_EVENTS].toCollection().modify (event) ->
          mapped_event = event.mapped or event.raw
          delete event.mapped
          delete event.raw
          delete event.meta
          $.extend event, mapped_event
      @db.version(8).stores version_5
      .upgrade (transaction) =>
        @logger.warn 'Database upgrade to version 8', transaction
        transaction[@OBJECT_STORE_CONVERSATION_EVENTS].toCollection().modify (event) ->
          if event.type is z.event.Client.CONVERSATION.DELETE_EVERYWHERE
            event.time = new Date(event.time).toISOString()
      @db.version(9).stores version_9
      @db.version(10).stores version_10
      .upgrade (transaction) =>
        @logger.warn 'Database upgrade to version 10', transaction
        transaction[@OBJECT_STORE_CONVERSATION_EVENTS].toCollection().modify (event) ->
          event.category = z.message.MessageCategorization.category_from_event event
      @db.version(11).stores version_11
      .upgrade (transaction) =>
        @logger.warn 'Database upgrade to version 11', transaction
        primary_key_local_client = z.client.ClientRepository.PRIMARY_KEY_CURRENT_CLIENT
        transaction[@OBJECT_STORE_CLIENTS].toCollection().each (client, cursor) =>
          if client.meta.primary_key is primary_key_local_client and client.primary_key isnt primary_key_local_client
            transaction[@OBJECT_STORE_CLIENTS].delete cursor.primaryKey
            transaction[@OBJECT_STORE_CLIENTS].put client, primary_key_local_client
      @db.version(12).stores version_11
        .upgrade (transaction) =>
          @logger.warn 'Database upgrade to version 12', transaction
          transaction[@OBJECT_STORE_KEYS].toCollection().modify (record) ->
            typed_array = z.util.base64_to_array record.serialised
            record.serialised = typed_array.buffer
          transaction[@OBJECT_STORE_PREKEYS].toCollection().modify (record) ->
            typed_array = z.util.base64_to_array record.serialised
            record.serialised = typed_array.buffer
          transaction[@OBJECT_STORE_SESSIONS].toCollection().modify (record) ->
            typed_array = z.util.base64_to_array record.serialised
            record.serialised = typed_array.buffer
      @db.version(13).stores version_12
        .upgrade (transaction) =>
          @logger.warn 'Database upgrade to version 13', transaction
          transaction[@OBJECT_STORE_CONVERSATION_EVENTS].toCollection().toArray()
          .then (items) =>
            return @db[@OBJECT_STORE_EVENTS].bulkPut items

      @db.open()
      .then =>
        @logger.info "Storage Service initialized with database '#{@db_name}' version '#{@db.verno}'"
        resolve @db_name
      .catch (error) =>
        @logger.error "Failed to initialize database '#{@db_name}' for Storage Service: #{error?.message or error}", {error: error}
        reject new z.storage.StorageError z.storage.StorageError::TYPE.FAILED_TO_OPEN


  ###############################################################################
  # Interactions
  ###############################################################################

  ###
  Removes persisted data.

  @param store_name [String] Name of the object store
  @param primary_key [String] Primary key
  @return [Promise] Promise that will resolve when the object is deleted
  ###
  delete: (store_name, primary_key) =>
    return new Dexie.Promise (resolve, reject) =>
      if @db[store_name]?
        return @db[store_name].delete primary_key
        .then =>
          @logger.info "Deleted '#{primary_key}' from object store '#{store_name}'"
          resolve primary_key
        .catch (error) =>
          @logger.error "Failed to delete '#{primary_key}' from store '#{store_name}'", error
          reject error
      reject new z.storage.StorageError z.storage.StorageError::TYPE.DATA_STORE_NOT_FOUND

  clear_all_stores: =>
    promises = (@delete_store store_name for store_name of @db._dbSchema)
    return Promise.all promises

  ###
  Delete a database store.
  @param store_name [String] Name of database store to delete
  @return [Promise]
  ###
  delete_store: (store_name) =>
    @logger.info "Clearing object store '#{store_name}' in database '#{@db_name}'"
    return @db[store_name].clear()

  ###
  Delete multiple database stores.
  @param store_names [Array<String>] Names of database stores to delete
  @return [Promise]
  ###
  delete_stores: (store_names) =>
    return Promise.all (@delete_store store_name for store_name in store_names)

  ###
  Delete the IndexedDB with all its stores.
  @return [Promise] Promise that will resolve if a database is found and cleared
  ###
  delete_everything: =>
    return new Dexie.Promise (resolve, reject) =>
      if @db?
        return @db.delete()
        .then =>
          @logger.info "Clearing IndexedDB '#{@db_name}' successful"
          resolve true
        .catch (error) =>
          @logger.error "Clearing IndexedDB '#{@db_name}' failed"
          reject error
      @logger.error "IndexedDB '#{@db_name}' not found"
      resolve true

  ###
  Returns an array of all records for a given object store.

  @param store_name [String] Name of object store
  @return [Promise] Promise that will resolve with the records from the object store
  ###
  get_all: (store_name) =>
    return @db[store_name].toArray()
    .catch (error) =>
      @logger.error "Could not load objects from store '#{store_name}'", error
      throw error

  ###
  Loads persisted data via a promise.

  @note If a key cannot be found, it resolves and returns "undefined".

  @param store_name [String] Name of object store
  @param primary_key [String] Primary key of object to be retrieved
  @return [Promise] Promise that will resolve with the record matching the primary key
  ###
  load: (store_name, primary_key) =>
    return @db[store_name].get primary_key
    .catch (error) =>
      @logger.error "Failed to load '#{primary_key}' from store '#{store_name}'", error
      throw error

  ###
  Saves objects in the local database.

  @param store_name [String] Name of object store where to save the object
  @param primary_key [String] Primary key which should be used to store the object
  @return [Promise] Promise that will resolve with the primary key of the persisted object
  ###
  save: (store_name, primary_key, entity) =>
    return @db[store_name].put entity, primary_key
    .catch (error) =>
      @logger.error "Failed to put '#{primary_key}' into store '#{store_name}'", error
      throw error

  ###
  Closes the database. This operation completes immediately and there is no returned Promise.
  @see https://github.com/dfahlander/Dexie.js/wiki/Dexie.close()
  @param reason [String] Cause for the termination
  ###
  terminate: (reason = 'unknown reason') ->
    @logger.info "Closing database connection with '#{@db.name}' because of '#{reason}'."
    @db.close()

  ###
  Update previously persisted data via a promise.

  @param store_name [String] Name of object store
  @param primary_key [String] Primary key of object to be updated
  @param changes [Object] Object containing the key paths to each property you want to change
  @return [Promise] Promise with the number of updated records (1 if an object was updated, otherwise 0).
  ###
  update: (store_name, primary_key, changes) =>
    return @db[store_name].update primary_key, changes
    .then (number_of_updates) =>
      @logger.info "Updated #{number_of_updates} record(s) with key '#{primary_key}' in store '#{store_name}'", changes
      return number_of_updates
    .catch (error) =>
      @logger.error "Failed to update '#{primary_key}' in store '#{store_name}'", error
      throw error
