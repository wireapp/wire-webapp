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

class z.ViewModel.LoadingViewModel
  constructor: (element_id, @user_repository) ->
    @loading_message = ko.observable ''
    @loading_step_current = ko.observable 0
    @loading_step_percentage = ko.observable 0
    @loading_step_total = 10

    amplify.subscribe z.event.WebApp.APP.UPDATE_INIT, @switch_message

    ko.applyBindings @, document.getElementById element_id

  switch_message: (message_locator, next_step = false, replace_content) =>
    if not z.util.Environment.frontend.is_production()
      _create_message = (message_locator, replacements) ->
        replacements = ({placeholder: replacement[0], content: replacement[1]} for replacement in replacements)
        return z.localization.Localizer.get_text {
          id: message_locator
          replace: replacements
        }

      @loading_message switch message_locator
        when z.string.init_received_self_user
          _create_message message_locator, [['%name', @user_repository.self().first_name()]]
        when z.string.init_events_expectation
          if replace_content[0] > 200
            message_locator = z.string.init_events_expectation_long
          _create_message message_locator, [['%events', replace_content[0]]]
        when z.string.init_events_progress, z.string.init_sessions_progress
          _create_message message_locator, [['%progress', replace_content[0]], ['%total', replace_content[1]]]
        when z.string.init_sessions_expectation
          if replace_content[0] > 100
            message_locator = z.string.init_sessions_expectation_long
          _create_message message_locator, [['%sessions', replace_content[0]]]
        else
          z.localization.Localizer.get_text message_locator

    @_next_step() if next_step

  _next_step: ->
    @loading_step_current (@loading_step_current() + 1) % @loading_step_total
    @loading_step_percentage "#{@loading_step_current() / @loading_step_total * 100}%"
