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
z.ViewModel ?= {}
z.ViewModel.content ?= {}

# Parent: z.ViewModel.CollectionViewModel
class z.ViewModel.content.CollectionDetailsViewModel
  constructor: ->
    @logger = new z.util.Logger 'z.ViewModel.CollectionDetailsViewModel', z.config.LOGGER.OPTIONS

    @template = ko.observable()
    @conversation_et = ko.observable()

    @items = ko.observableArray()

    @last_message_timestamp = undefined

  set_conversation: (conversation_et, category, items) =>
    @template category
    @conversation_et conversation_et
    @push_deferred @items, items

  removed_from_view: =>
    @conversation_et null
    @items.removeAll()

  should_show_header: (message_et) =>
    if not @last_message_timestamp? or moment(message_et.timestamp).format('M') isnt moment(@last_message_timestamp).format('M')
      @last_message_timestamp = message_et.timestamp
      return true

  click_on_back_button: ->
    amplify.publish z.event.WebApp.CONTENT.SWITCH, z.ViewModel.content.CONTENT_STATE.COLLECTION

  click_on_image: (message_et) ->
    amplify.publish z.event.WebApp.CONVERSATION.DETAIL_VIEW.SHOW,  message_et

  # helper
  push_deferred: (target, src, number = 100, delay = 300) ->
    interval = window.setInterval ->
      chunk = src.splice 0, number
      z.util.ko_array_push_all target, chunk

      if src.length is 0
        window.clearInterval interval

    , delay
