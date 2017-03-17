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
z.components ?= {}

class z.components.CommonContactsViewModel
  constructor: (params, component_info) ->
    # parameter list
    @user = params.user
    @element = component_info.element
    @search_repository = wire.app.repository.search

    @common_contacts_caption = ko.observable ''
    @common_contacts_total = ko.pureComputed =>
      if not @user?
        return @common_contacts_caption ''

      user = ko.unwrap @user

      @search_repository.get_common_contacts(user.username()).then (total) =>
        if total > 0
          locale_id = if total > 1 then z.string.search_friends_in_common else z.string.search_friend_in_common
          @common_contacts_caption z.localization.Localizer.get_text
            id: locale_id
            replace:
              placeholder: '%no',
              content: total
        else
          @common_contacts_caption ''

ko.components.register 'common-contacts',
  viewModel: createViewModel: (params, component_info) ->
    return new z.components.CommonContactsViewModel params, component_info
  template: """
            <!-- ko if: common_contacts_total -->
              <span data-bind="text: common_contacts_caption" data-uie="common-contacts"></span>
            <!-- /ko -->
            """
