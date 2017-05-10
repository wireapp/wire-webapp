/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.components = z.components || {};

z.components.GroupAvatar = class GroupAvatar {
  constructor({users}) {
    this.users = ko.pureComputed(() => users().slice(0, 4));
  }
};

ko.components.register('group-avatar', {
  template: `
    <div class="group-avatar-box-wrapper">
      <!-- ko foreach: users -->
        <div class="group-avatar-box" data-bind="text: Array.from($data.initials())[0], style: {color: $data.accent_color()}"></div>
      <!-- /ko -->
    </div>
  `,
  viewModel: z.components.GroupAvatar,
});
