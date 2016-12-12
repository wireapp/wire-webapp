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
  constructor: (element_id, @call_center, @conversation_repository, @multitasking) ->
    @logger = new z.util.Logger 'z.ViewModel.ConversationTitlebarViewModel', z.config.LOGGER.OPTIONS

    # TODO remove this for now to ensure that buttons are clickable in macOS wrappers
    window.setTimeout ->
      $('.titlebar').remove()
    , 1000

    @conversation_et = @conversation_repository.active_conversation
    @call_self_state = @call_center.media_stream_handler.self_stream_state
    @joined_call = @call_center.joined_call

    @has_call = ko.pureComputed =>
      return false if not @conversation_et() or not @joined_call()
      return @conversation_et().id is @joined_call().id

    @has_ongoing_call = ko.computed =>
      return false if not @joined_call()
      return @has_call() and @joined_call().state() is z.calling.enum.CallState.ONGOING

    @show_maximize_control = ko.pureComputed =>
      return false if not @joined_call()
      has_local_video = @call_self_state.videod() or @call_self_state.screen_shared()
      has_remote_video = (@joined_call().is_remote_screen_shared() or @joined_call().is_remote_videod()) and @call_center.media_stream_handler.remote_media_streams.video()
      return @has_ongoing_call() and @multitasking.is_minimized() and has_local_video and not has_remote_video

    @show_call_controls = ko.computed =>
      return false if not @conversation_et()
      is_supported_conversation = @conversation_et().is_group() or @conversation_et().is_one2one()
      is_active_conversation = @conversation_et().participating_user_ids().length and not @conversation_et().removed_from_conversation()
      return not @has_call() and is_supported_conversation and is_active_conversation

    @people_tooltip = z.localization.Localizer.get_text
      id: z.string.tooltip_conversation_people
      replace:
        placeholder: '%shortcut'
        content: z.ui.Shortcut.get_shortcut_tooltip z.ui.ShortcutType.PEOPLE

  added_to_view: =>
    setTimeout =>
      amplify.subscribe z.event.WebApp.SHORTCUT.PEOPLE, => @show_participants()
      amplify.subscribe z.event.WebApp.SHORTCUT.ADD_PEOPLE, => @show_participants true
    , 50

  removed_from_view: ->
    amplify.unsubscribe z.event.WebApp.SHORTCUT.PEOPLE
    amplify.unsubscribe z.event.WebApp.SHORTCUT.ADD_PEOPLE

  click_on_call_button: =>
    return if not @conversation_et()
    amplify.publish z.event.WebApp.CALL.STATE.TOGGLE, @conversation_et().id

  click_on_maximize: =>
    @multitasking.auto_minimize false
    @multitasking.is_minimized false
    @logger.log @logger.levels.INFO, "Maximizing call '#{@joined_call().id}' on user click"

  click_on_participants: =>
    @show_participants()

  click_on_video_button: =>
    return if not @conversation_et()
    if @conversation_et().is_group()
      amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CALL_NO_VIDEO_IN_GROUP
    else
      amplify.publish z.event.WebApp.CALL.STATE.TOGGLE, @conversation_et().id, true

  show_participants: (add_people) ->
    amplify.publish z.event.WebApp.PEOPLE.TOGGLE, add_people
