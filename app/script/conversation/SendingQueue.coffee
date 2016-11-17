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

SENDING_QUEUE_UNBLOCK_INTERVAL = 60 * 1000

window.z ?= {}
z.conversation ?= {}

class z.conversation.SendingQueue

  constructor: ->
    @_promises = []
    @_queue = ko.observableArray []
    @_blocked = false
    @_interval = undefined
    @_paused = false

    @_queue.subscribe @execute

  ###
  Adds a generic message to a the sending queue.

  @param fn [Function] Conversation ID
  @return [Promise] Promise that resolves when the message was sent
  ###
  push: (fn) =>
    return new Promise (resolve, reject) =>
      queue_entry =
        function: fn
        resolve: resolve
        reject: reject
      @_queue.push queue_entry

  ###
  Sends a generic message from the sending queue.
  ###
  execute: =>
    return if @_paused or @_blocked

    queue_entry = @_queue()[0]
    if queue_entry
      @_blocked = true
      @_interval = window.setInterval =>
        return if @_paused
        @_blocked = false
        window.clearInterval @_interval
        @logger.log @logger.levels.ERROR, 'Sending of message from queue failed, unblocking queue', @_queue()
        @execute()
      , SENDING_QUEUE_UNBLOCK_INTERVAL

      queue_entry.function()
      .catch (error) ->
        queue_entry.reject error
      .then (response) =>
        # TODO if response is null/undefined/false/0 promise will not resolve
        queue_entry.resolve response if response
        window.clearInterval @_interval
        @_blocked = false
        @_queue.shift()

  ###
  Pause or resume the execution.

  @param should_pause [Boolean]
  ###
  pause: (should_pause) =>
    @_paused should_pause
