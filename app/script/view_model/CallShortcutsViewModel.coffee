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

###
Last remainder of the CallBannerViewModel.
@todo Move functionality elsewhere and remove
###
class z.ViewModel.CallShortcutsViewModel
  constructor: (@call_view_model) ->
    @logger = new z.util.Logger 'z.ViewModel.CallShortcutsViewModel', z.config.LOGGER.OPTIONS

    @joined_call = @call_view_model.joined_call

    @joined_call.subscribe (call_et) =>
      @_update_shortcut_subscription call_et

  ###########################
  # Shortcuts
  ###########################

  _update_shortcut_subscription: (call_et) =>
    @_unsubscribe_shortcuts()
    return if not call_et

    switch call_et.state()
      when z.calling.enum.CallState.ONGOING, z.calling.enum.CallState.OUTGOING
        @_subscribe_shortcuts_outgoing_ongoing()
      when z.calling.enum.CallState.INCOMING
        @_subscribe_shortcuts_incoming()

    conversation_name = call_et.conversation_et.display_name()
    @logger.debug "Updated call shortcuts for '#{call_et.state()}' call in conversation '#{call_et.id}' (#{conversation_name})"

  _subscribe_shortcuts_incoming: =>
    amplify.subscribe z.event.WebApp.SHORTCUT.CALL_IGNORE, @on_ignore_call

  _subscribe_shortcuts_outgoing_ongoing: =>
    amplify.subscribe z.event.WebApp.SHORTCUT.CALL_MUTE, @on_mute_call

  _unsubscribe_shortcuts: =>
    amplify.unsubscribe z.event.WebApp.SHORTCUT.CALL_MUTE, @on_mute_call
    amplify.unsubscribe z.event.WebApp.SHORTCUT.CALL_IGNORE, @on_ignore_call

  ###########################
  # Component actions
  ###########################

  on_ignore_call: =>
    amplify.publish z.event.WebApp.CALL.STATE.IGNORE, @joined_call()?.id

  on_mute_call: =>
    amplify.publish z.event.WebApp.CALL.MEDIA.TOGGLE, @joined_call()?.id, z.media.MediaType.AUDIO
