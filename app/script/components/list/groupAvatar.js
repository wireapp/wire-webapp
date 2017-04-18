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
  constructor(params) {
    this.users = params.users;
    this.on_in_viewport = this.on_in_viewport.bind(this);

    this.slot0 = ko.observable('');
    this.slot1 = ko.observable('');
    this.slot2 = ko.observable('');
    this.slot3 = ko.observable('');
  }

  on_in_viewport() {
    console.debug('in viewport')
    this.users().forEach((user_et, index) => {
      const preview = user_et.preview_picture_resource();

      if (preview) {
        preview.get_object_url().then((url) => {
          this[`slot${index}`](`url("${url}")`);
        });
      }
    });

    return true;
  }
};

ko.components.register('group-avatar', {
  viewModel: z.components.GroupAvatar,
  template: `
    <div class="group-avatar-image-wrapper" data-bind="in_viewport: on_in_viewport">
      <div class="group-avatar-image" data-bind="style: {backgroundImage: slot0}"></div>
      <div class="group-avatar-image" data-bind="style: {backgroundImage: slot1}"></div>
      <div class="group-avatar-image" data-bind="style: {backgroundImage: slot2}"></div>
      <div class="group-avatar-image" data-bind="style: {backgroundImage: slot3}"></div>
    </div>
  `,
});
