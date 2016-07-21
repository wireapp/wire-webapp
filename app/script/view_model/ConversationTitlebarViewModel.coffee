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

# Parent: z.ViewModel.ConversationTitlebarViewModel
class z.ViewModel.ConversationTitlebarViewModel
  constructor: (element_id, @conversation_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.ConversationTitlebarViewModel', z.config.LOGGER.OPTIONS

    # TODO remove this for now to ensure that buttons are clickable in osx wrappers
    window.setTimeout ->
      $('.titlebar').remove()
    , 1000

    @conversation_et = @conversation_repository.active_conversation

    @show_call_controls = ko.computed =>
      return false if not @conversation_et()
      is_supported_conversation = @conversation_et().is_group() or @conversation_et().is_one2one()
      is_active_conversation = @conversation_et().participating_user_ids().length and not @conversation_et().removed_from_conversation()
      is_self_client_joined = @conversation_et().call()?.self_client_joined()
      return is_supported_conversation and is_active_conversation and not is_self_client_joined

    @people_tooltip = z.localization.Localizer.get_text {
      id: z.string.tooltip_conversation_people
      replace: {placeholder: '%shortcut', content: z.ui.Shortcut.get_shortcut_tooltip z.ui.ShortcutType.PEOPLE}
    }

  added_to_view: =>
    setTimeout =>
      amplify.subscribe z.event.WebApp.SHORTCUT.PEOPLE, => @show_participants()
      amplify.subscribe z.event.WebApp.SHORTCUT.ADD_PEOPLE, => @show_participants true
    , 50

  removed_from_view: ->
    amplify.unsubscribe z.event.WebApp.SHORTCUT.PEOPLE
    amplify.unsubscribe z.event.WebApp.SHORTCUT.ADD_PEOPLE

  click_on_call_button: =>
    amplify.publish z.event.WebApp.CALL.STATE.TOGGLE, @conversation_et().id

  click_on_participants: =>
    @show_participants()

  click_on_video_button: =>
    if @conversation_et().is_group()
      amplify.publish z.event.WebApp.WARNINGS.MODAL, z.ViewModel.ModalType.CALL_NO_VIDEO_IN_GROUP
    else
      amplify.publish z.event.WebApp.CALL.STATE.TOGGLE, @conversation_et().id, true

  show_participants: (add_people) ->
    amplify.publish z.event.WebApp.PEOPLE.TOGGLE, add_people
