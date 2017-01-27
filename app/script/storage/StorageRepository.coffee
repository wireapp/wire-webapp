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

class z.storage.StorageRepository
  constructor: (@storage_service) ->
    @logger = new z.util.Logger 'z.storage.StorageRepository', z.config.LOGGER.OPTIONS

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

  clear_all_stores: =>
    @storage_service.clear_all_stores()
    .then => @logger.info "Cleared database '#{@storage_service.db_name}'"

  ###
  Delete cryptography related information.
  @note Retain history but clean other information.
  ###
  delete_cryptography: =>
    @storage_service.delete_stores [
      @storage_service.OBJECT_STORE_AMPLIFY
      @storage_service.OBJECT_STORE_CLIENTS
      @storage_service.OBJECT_STORE_KEYS
      @storage_service.OBJECT_STORE_SESSIONS
      @storage_service.OBJECT_STORE_PREKEYS
    ]

  # Nuke the database.
  delete_everything: =>
    @logger.warn "Deleting database '#{@storage_service.db_name}'"
    return @storage_service.delete_everything()
