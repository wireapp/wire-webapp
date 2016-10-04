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
z.ViewModel.list ?= {}


class z.ViewModel.list.ArchiveViewModel
  ###
  @param element_id [String] HTML selector
  @param list_view_model [z.ViewModel.list.ListViewModel] List view model
  @param conversation_repository [z.conversation.ConversationRepository] Conversation repository
  ###
  constructor: (element_id, @list_view_model, @conversation_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.list.ArchiveViewModel', z.config.LOGGER.OPTIONS

    @conversations_archived = @conversation_repository.conversations_archived

    @should_update_scrollbar = (ko.computed =>
      return @list_view_model.last_update()
    ).extend notify: 'always', rateLimit: 500

  click_on_actions: (conversation_et, event) =>
    @list_view_model.actions.click_on_actions conversation_et, event

  click_on_close_archive: =>
    @list_view_model.switch_list z.ViewModel.list.LIST_STATE.CONVERSATIONS

  click_on_archived_conversation: (conversation_et) =>
    @conversation_repository.unarchive_conversation conversation_et
    @list_view_model.switch_list z.ViewModel.list.LIST_STATE.CONVERSATIONS
    amplify.publish z.event.WebApp.CONVERSATION.SHOW, conversation_et

  update_list: =>
    @conversation_repository.update_conversations @conversation_repository.conversations_archived()
