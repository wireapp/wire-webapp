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


class z.ViewModel.ArchiveViewModel
  constructor: (element_id, @conversation_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.ArchiveViewModel', z.config.LOGGER.OPTIONS

    @conversations_archived = @conversation_repository.conversations_archived
    @is_archive_visible = ko.observable()

    @should_update_scrollbar = (ko.computed =>
      return @is_archive_visible()
    ).extend notify: 'always', rateLimit: 500

    @_init_subscriptions()

    ko.applyBindings @, document.getElementById element_id

  _init_subscriptions: =>
    amplify.subscribe z.event.WebApp.ARCHIVE.SHOW, @open
    amplify.subscribe z.event.WebApp.SEARCH.SHOW, @close
    amplify.subscribe z.event.WebApp.ARCHIVE.CLOSE, @close

  click_on_actions: (conversation_et, event) ->
    amplify.publish z.event.WebApp.ACTION.SHOW, conversation_et, event

  click_on_close_archive: ->
    amplify.publish z.event.WebApp.ARCHIVE.CLOSE

  click_on_archived_conversation: (conversation_et) =>
    @conversation_repository.unarchive_conversation conversation_et
    amplify.publish z.event.WebApp.CONVERSATION.SHOW, conversation_et
    amplify.publish z.event.WebApp.ARCHIVE.CLOSE

  open: =>
    $(document).on 'keydown.show_archive', (event) ->
      amplify.publish z.event.WebApp.ARCHIVE.CLOSE if event.keyCode is z.util.KEYCODE.ESC
    @conversation_repository.update_conversations @conversation_repository.conversations_archived()
    @is_archive_visible Date.now()
    @_show()

  close: =>
    $(document).off 'keydown.show_archive'
    @_hide()

###############################################################################
# Archive animations
###############################################################################
  _show: ->
    $('#archive').addClass 'archive-is-visible'

  _hide: ->
    $('#archive').removeClass 'archive-is-visible'
