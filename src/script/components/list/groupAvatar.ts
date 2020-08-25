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

import ko from 'knockout';
import type {User} from '../../entity/User';

interface ComponentParams {
  users: ko.PureComputed<User[]>;
}

ko.components.register('group-avatar', {
  template: `
    <div class="group-avatar-box-wrapper" data-bind="foreach: users">
      <div class="group-avatar-box" data-bind="text: Array.from($data.initials())[0], style: {color: $data.accent_color()}"></div>
    </div>
  `,
  viewModel: class {
    readonly users: ko.PureComputed<User[]>;

    constructor(params: ComponentParams) {
      this.users = ko.pureComputed(() => params.users().slice(0, 4));
    }
  },
});
