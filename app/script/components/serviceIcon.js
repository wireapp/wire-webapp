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

'use strict';

window.z = window.z || {};
window.z.components = z.components || {};

z.components.ServiceIcon = class ServiceIcon {
  constructor(params, component_info) {
    this.dispose = this.dispose.bind(this);

    this.service = ko.unwrap(params.service);
    this.badge = params.badge || false;
    this.delay = params.delay;
    this.element = $(component_info.element);

    this.avatar_loading_blocked = false;
    this.avatar_entered_viewport = false;

    this.on_in_viewport = () => {
      this.avatar_entered_viewport = true;
      this._load_avatar_picture();
      return true;
    };

    this._load_avatar_picture = () => {
      if (!this.avatar_loading_blocked) {
        this.avatar_loading_blocked = true;
        if (this.service.previewPictureResource()) {
          this.service
            .previewPictureResource()
            .get_object_url()
            .then(url => {
              const image = new Image();
              image.src = url;
              this.element
                .find('.service-icon-image')
                .empty()
                .append(image);
              this.element.addClass('user-avatar-image-loaded user-avatar-loading-transition');
              this.avatar_loading_blocked = false;
            });
        }
      }
    };

    this.picture_preview_subscription = this.service.previewPictureResource.subscribe(() => {
      if (this.avatar_entered_viewport) {
        this._load_avatar_picture();
      }
    });
  }

  dispose() {
    this.picture_preview_subscription.dispose();
  }
};

ko.components.register('service-icon', {
  template: `
    <div class="service-icon" data-uie-name="service-icon" data-bind="attr: {title: service.name}, in_viewport: on_in_viewport, delay: delay">
      <div class="service-icon-image"></div>
    </div>
  `,
  viewModel: {
    createViewModel(params, component_info) {
      return new z.components.ServiceIcon(params, component_info);
    },
  },
});
