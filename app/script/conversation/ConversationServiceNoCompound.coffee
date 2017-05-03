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
z.conversation ?= {}

# TODO: This function can be removed once Microsoft Edge's IndexedDB supports compound indices:
# - https://developer.microsoft.com/en-us/microsoft-edge/platform/status/indexeddbarraysandmultientrysupport/
class z.conversation.ConversationServiceNoCompound extends z.conversation.ConversationService

  constructor: (client, storage_service) ->
    super client, storage_service

  ###
  Load conversation events. Start and end are not included. Events are always sorted beginning with the newest timestamp.

  @param conversation_id [String] ID of conversation
  @param start [Number] starting from this timestamp
  @param end [Number] stop when reaching timestamp
  @param limit [Number] Amount of events to load
  @return [Promise] Promise that resolves with the retrieved records
  ###
  load_preceding_events_from_db: (conversation_id, lower_bound = new Date(0), upper_bound = new Date(), limit) ->
    if not _.isDate(lower_bound) or not _.isDate upper_bound
      throw new Error "Lower bound (#{typeof lower_bound}) and upper bound (#{typeof upper_bound}) must be of type 'Date'."
    else if lower_bound.getTime() > upper_bound.getTime()
      throw new Error "Lower bound (#{lower_bound.getTime()}) cannot be greater than upper bound (#{upper_bound.getTime()})."

    lower_bound = lower_bound.getTime()
    upper_bound = upper_bound.getTime()

    @storage_service.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
    .where 'conversation'
    .equals conversation_id
    .reverse()
    .sortBy 'time'
    .then (records) ->
      return records.filter (record) ->
        timestamp = new Date(record.time).getTime()
        return timestamp >= lower_bound and timestamp < upper_bound
    .then (records) ->
      return records.slice 0, limit

  ###
  Get events with given category.
  @param conversation_id [String] ID of conversation to add users to
  @param category [z.message.MessageCategory] will be used as lower bound
  @return [Promise]
  ###
  load_events_with_category_from_db: (conversation_id, category) ->
    @storage_service.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
    .where 'conversation'
    .equals conversation_id
    .sortBy 'time'
    .then (records) ->
      records.filter (record) -> record.category >= category
