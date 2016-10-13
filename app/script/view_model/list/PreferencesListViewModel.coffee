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


class z.ViewModel.list.PreferencesListViewModel
  ###
  @param element_id [String] HTML selector
  @param list_view_model [z.ViewModel.list.ListViewModel] List view model
  ###
  constructor: (element_id, @list_view_model, @content_view_model) ->
    @logger = new z.util.Logger 'z.ViewModel.list.PreferencesListViewModel', z.config.LOGGER.OPTIONS

    @preferences_state = @content_view_model.content_state
    @should_update_scrollbar = (ko.computed =>
      return @list_view_model.last_update()
    ).extend notify: 'always', rateLimit: 500

    @selected_about = ko.pureComputed => @preferences_state() is z.ViewModel.content.CONTENT_STATE.PREFERENCES_ABOUT
    @selected_account = ko.pureComputed => @preferences_state() is z.ViewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT
    @selected_devices = ko.pureComputed => @preferences_state() in [z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICE_DETAILS, z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICES]
    @selected_options = ko.pureComputed => @preferences_state() is z.ViewModel.content.CONTENT_STATE.PREFERENCES_OPTIONS

  click_on_close_preferences: =>
    @list_view_model.switch_list z.ViewModel.list.LIST_STATE.CONVERSATIONS

  click_on_about: =>
    @content_view_model.switch_content z.ViewModel.content.CONTENT_STATE.PREFERENCES_ABOUT

  click_on_account: =>
    @content_view_model.switch_content z.ViewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT

  click_on_devices: =>
    @content_view_model.switch_content z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICES

  click_on_options: =>
    @content_view_model.switch_content z.ViewModel.content.CONTENT_STATE.PREFERENCES_OPTIONS
