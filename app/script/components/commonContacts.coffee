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
    @user = ko.unwrap params.user
    @element = component_info.element
    @search_repository = wire.app.repository.search

    @common_contacts_total = ko.observable 0

    @common_contacts_caption = ko.pureComputed =>
      locale_id = if @common_contacts_total() > 1 then z.string.search_friends_in_common else z.string.search_friend_in_common
      return z.localization.Localizer.get_text
        id: locale_id
        replace:
          placeholder: '%no',
          content: @common_contacts_total()

    @search_repository.get_common_contacts(@user.id).then (total) =>
      @user.mutual_friends_total total
      @common_contacts_total total

ko.components.register 'common-contacts',
  viewModel: createViewModel: (params, component_info) ->
    return new z.components.CommonContactsViewModel params, component_info
  template: """
            <!-- ko if: common_contacts_total -->
              <span data-bind="text: common_contacts_caption"></span>
            <!-- /ko -->
            """
