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

    @displayed_contacts = ko.observableArray()
    @more_contacts = ko.observable 0
    @_set_contacts_data 0

    @search_repository.get_common_contacts @user.id
    .then (user_ets) =>
      @_display_contacts user_ets

  _set_contacts_data: (value) ->
    $(@element).attr 'data-contacts', value

  _display_contacts: (contacts) =>
    number_of_contacts = contacts.length
    number_to_show = if number_of_contacts is 4 then 4 else 3
    @displayed_contacts contacts.slice 0, number_to_show
    @more_contacts number_of_contacts - number_to_show
    @_set_contacts_data number_of_contacts


ko.components.register 'common-contacts',
  viewModel: createViewModel: (params, component_info) ->
    return new z.components.CommonContactsViewModel params, component_info
  template: """
              <div class="common-contacts-title label-xs" data-bind="l10n_text: z.string.people_common_contacts"></div>
              <div class="common-contacts-items" data-bind="foreach: displayed_contacts">
                <div class="common-contacts-item" data-bind="attr: {'data-uie-uid': id, 'data-uie-value': first_name}" data-uie-name="item-you-both-know" >
                  <user-avatar class="user-avatar-sm" params="user: $data"></user-avatar>
                  <div class="common-contacts-label label-xs" data-bind="text: first_name"></div>
                </div>
              </div>
              <!-- ko if: more_contacts() > 0 -->
                <span class="common-contacts-more" data-bind="text: '+' + more_contacts()" data-uie-name="item-you-both-know" data-uie-value="others"></span>
              <!-- /ko -->
            """
