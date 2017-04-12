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
    @loading_progress = ko.observable 0
    @loading_percentage = ko.pureComputed =>
      return "#{@loading_progress()}%"

    amplify.subscribe z.event.WebApp.APP.UPDATE_PROGRESS, @update_progress

    ko.applyBindings @, document.getElementById element_id

  update_progress: (progress = 0, message_locator, replace_content) =>
    if progress > @loading_progress()
      @loading_progress progress
    else
      @loading_progess @loading_progress() + .01

    if message_locator and not z.util.Environment.frontend.is_production()
      @loading_message switch message_locator
        when z.string.init_received_self_user
          z.localization.Localizer.get_text
            id: message_locator
            replace:
              placeholder: '%name'
              content: @user_repository.self().first_name()
        when z.string.init_events_progress
          z.localization.Localizer.get_text
            id: message_locator
            replace: [
              {placeholder: '%progress', content: replace_content[0]}
              {placeholder: '%total', content: replace_content[1]}
            ]
        else
          z.localization.Localizer.get_text message_locator
