/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {ParticipantAvatar} from 'Components/participantAvatar';

class GroupListViewModel {
  /**
   * Construct a new group list view model.
   *
   * @param {Object} params Component parameters
   * @param {ko.observableArray} params.groups Data source
   * @param {Function} params.click Function called when a list item is clicked
   */
  constructor(params) {
    this.groups = params.groups;
    this.onSelect = params.click;
    this.ParticipantAvatar = ParticipantAvatar;
  }
}

// Knockout registration of the group list component.
ko.components.register('group-list', {
  template: `
    <div class="search-list search-list-lg" data-bind="foreach: {data: groups, as: 'group', noChildContext: true}">
      <div class="search-list-item" data-bind="click: () => onSelect(group), attr: {'data-uie-uid': group.id, 'data-uie-value': group.display_name}" data-uie-name="item-group">
        <div class="search-list-item-image">
          <!-- ko if: group.is1to1() -->
            <participant-avatar params="participant: group.participating_user_ets()[0], size: ParticipantAvatar.SIZE.SMALL"></participant-avatar>
          <!-- /ko -->
          <!-- ko ifnot: group.is1to1() -->
            <group-avatar params="users: group.participating_user_ets()"></group-avatar>
          <!-- /ko -->
        </div>
        <div class="search-list-item-header" data-bind="text: group.display_name"></div>
      </div>
    </div>
  `,
  viewModel: GroupListViewModel,
});
