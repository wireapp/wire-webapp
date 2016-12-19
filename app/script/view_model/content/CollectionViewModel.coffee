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

# Parent: z.ViewModel.ContentViewModel
class z.ViewModel.content.CollectionViewModel
  constructor: (element_id, @conversation_repository, @collection_details) ->
    @logger = new z.util.Logger 'z.ViewModel.CollectionViewModel', z.config.LOGGER.OPTIONS

    @conversation_et = ko.observable()

    @images = ko.observableArray()
    @files = ko.observableArray()
    @audio = ko.observableArray()
    @video = ko.observableArray()
    @files = ko.observableArray()
    @links = ko.observableArray()

    @no_items_found = ko.observable false

  set_conversation: (conversation_et) =>
    @conversation_et conversation_et
    @conversation_repository.get_events_for_category conversation_et, z.message.MessageCategory.LINK_PREVIEW
    .then (message_ets) =>
      if message_ets.length is 0
        @no_items_found true

      # TODO intermediate arrays or rateLimit
      for message_et, i in message_ets
        switch
          when (message_et.category & z.message.MessageCategory.IMAGE) is z.message.MessageCategory.IMAGE
            @images.push message_et
          when (message_et.category & z.message.MessageCategory.FILE) is z.message.MessageCategory.FILE
            asset_et = message_et.get_first_asset()
            switch
              when asset_et.is_video()
                @video.push message_et
              when asset_et.is_audio()
                @audio.push message_et
              else
                @files.push message_et
          when (message_et.category & z.message.MessageCategory.LINK_PREVIEW) is z.message.MessageCategory.LINK_PREVIEW
            @links.push message_et

  removed_from_view: =>
    @no_items_found false
    @conversation_et null
    [@images, @files, @links, @audio, @video].forEach (array) -> array.removeAll()

  click_on_back_button: =>
    amplify.publish z.event.WebApp.CONVERSATION.SHOW, @conversation_et()

  click_on_section: (category, items) =>
    @collection_details.set_conversation @conversation_et(), category, [].concat items
    amplify.publish z.event.WebApp.CONTENT.SWITCH, z.ViewModel.content.CONTENT_STATE.COLLECTION_DETAILS
