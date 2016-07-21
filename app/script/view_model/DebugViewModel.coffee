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

class z.ViewModel.DebugViewModel
  constructor: (element_id, @conversation_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.DebugViewModel', z.config.LOGGER.OPTIONS
    @debug_view = $("##{element_id}")
    if @debug_view.length is 0
      return

    @title = ko.observable 'Debug info'
    @info = ko.observable ''
    @conversation = @conversation_repository.active_conversation
    @self_user = @user_repository.self

    amplify.subscribe z.event.WebApp.SHORTCUT.DEBUG, -> $('#debug').toggleClass 'hide'

    ko.applyBindings @, @debug_view.get(0)

  inject_audio: (audio_file) ->
    audio_file_path = "audio/buzzer/#{audio_file}"
    return audio_file_path

  inject_audio_to_participants: ->
    wire.app.repository.call_center.count_flows @conversation().id

  download_call_trace: ->
    file_name = "#{wire.app.repository.user.self().name()} (#{wire.app.repository.user.self().id}).js"
    text = JSON.stringify wire.app.repository.call_center.log_trace()
    element = document.createElement 'a'
    element.setAttribute 'href', "data:text/plain;charset=utf-8,#{encodeURIComponent(text)}"
    element.setAttribute 'download', file_name
    element.style.display = 'none'
    document.body.appendChild element
    element.click()
    document.body.removeChild element

  log_call_to_console: ->
    wire.app.repository.call_center.log_call()

  log_call_banner_state_to_console: ->
    wire.app.view.content.call_controls.log_state()

  log_session_ids_to_console: ->
    wire.app.repository.call_center.log_calls()
