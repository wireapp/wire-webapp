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
    this.on_in_viewport = this.on_in_viewport.bind(this);
    this.entered_viewport = ko.observable(false);
    this.avatar_urls = ko.observableArray();

    this.user_image_observable = ko.computed(() => {
      if (!this.entered_viewport()) {
        return;
      }

      const promises = users().slice(0, 4)
        .map((user_et) => user_et.preview_picture_resource())
        .filter((resource) => resource !== undefined)
        .map((resource) => resource.get_object_url());

      Promise.all(promises).then((urls) => this.avatar_urls(urls.map((url) =>`url(${url})`)));
    }).extend({rateLimit: 50});
  }

  on_in_viewport() {
    this.entered_viewport(true);
    return true;
  }

  dispose() {
    this.user_image_observable.dispose()
  }
};

ko.components.register('group-avatar', {
  viewModel: z.components.GroupAvatar,
  template: `
    <div class="group-avatar-image-wrapper" data-bind="in_viewport: on_in_viewport">
      <!-- ko foreach: avatar_urls -->
        <div class="group-avatar-image" data-bind="css: {'group-avatar-image-grid': $parent.avatar_urls().length > 1}, style: {backgroundImage: $data}"></div>
      <!-- /ko -->
    </div>
  `,
});
