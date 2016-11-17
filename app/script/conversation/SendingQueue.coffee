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

class z.conversation.SendingQueue

  constructor: ->
    @sending_promises = []
    @sending_queue = ko.observableArray []
    @sending_blocked = false
    @sending_interval = undefined

    @sending_queue.subscribe @execute_from_sending_queue

  ###
  Adds a generic message to a the sending queue.

  @param fn [Function] Conversation ID
  @return [Promise] Promise that resolves when the message was sent
  ###
  add_to_sending_queue: (fn) =>
    return new Promise (resolve, reject) =>
      queue_entry =
        function: fn
        resolve: resolve
        reject: reject
      @sending_queue.push queue_entry

  ###
  Sends a generic message from the sending queue.
  ###
  execute_from_sending_queue: =>
    return if @block_event_handling or @sending_blocked

    queue_entry = @sending_queue()[0]
    if queue_entry
      @sending_blocked = true
      @sending_interval = window.setInterval =>
        return if @conversation_service.client.request_queue_blocked_state() isnt z.service.RequestQueueBlockedState.NONE
        @sending_blocked = false
        window.clearInterval @sending_interval
        @logger.log @logger.levels.ERROR, 'Sending of message from queue failed, unblocking queue', @sending_queue()
        @execute_from_sending_queue()
      , z.config.SENDING_QUEUE_UNBLOCK_INTERVAL

      queue_entry.function()
      .catch (error) ->
        queue_entry.reject error
      .then (response) =>
        queue_entry.resolve response if response
        window.clearInterval @sending_interval
        @sending_blocked = false
        @sending_queue.shift()
