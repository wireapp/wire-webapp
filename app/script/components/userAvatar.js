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

z.components.UserAvatar = class UserAvatar {
  constructor(params, component_info) {
    this.dispose = this.dispose.bind(this);

    this.user = ko.unwrap(params.user);
    this.badge = params.badge || false;
    this.delay = params.delay;
    this.element = $(component_info.element);
    this.is_team_member = params.is_team_member || false;

    this.avatar_loading_blocked = false;
    this.avatar_entered_viewport = false;

    if (!this.user) {
      this.user = new z.entity.User();
    }

    this.element.attr({
      id: z.util.create_random_uuid(),
      'user-id': this.user.id
    });

    this.initials = ko.pureComputed(() => {
      if (this.element.hasClass('user-avatar-xs')) {
        return z.util.StringUtil.get_first_character(this.user.initials());
      }

      return this.user.initials();
    });

    this.state = ko.pureComputed(() => {
      if (this.user.is_me) {
        return 'self';
      }

      if (typeof params.selected === 'function' && params.selected()) {
        return 'selected';
      }

      if (this.is_team_member) {
        return '';
      }

      if (this.user.is_blocked()) {
        return 'blocked';
      }

      if (this.user.is_request()) {
        return 'pending';
      }

      if (this.user.is_ignored()) {
        return 'ignored';
      }

      if (this.user.is_canceled() || this.user.is_unknown()) {
        return 'unknown';
      }

      return '';
    });

    this.css_classes = ko.pureComputed(() => {
      let class_string = `accent-color-${this.user.accent_id()}`;
      if (this.state()) {
        class_string += ` ${this.state()}`;
      }
      return class_string;
    });

    this.on_click = (data, event) => {
      if (typeof params.click === 'function') {
        params.click(data.user, event.currentTarget.parentNode);
      }
    };

    this.on_in_viewport = () => {
      this.avatar_entered_viewport = true;
      this._load_avatar_picture();
      return true;
    };

    this._load_avatar_picture = () => {
      if (!this.avatar_loading_blocked) {
        this.avatar_loading_blocked = true;
        if (this.user.preview_picture_resource()) {
          this.user.preview_picture_resource().get_object_url().then(url => {
            const image = new Image();
            image.src = url;
            this.element.find('.user-avatar-image').empty().append(image);
            this.element.addClass('user-avatar-image-loaded user-avatar-loading-transition');
            this.avatar_loading_blocked = false;
          });
        }
      }
    };

    this.picture_preview_subscription = this.user.preview_picture_resource.subscribe(() => {
      if (this.avatar_entered_viewport) {
        this._load_avatar_picture();
      }
    });
  }

  dispose() {
    this.picture_preview_subscription.dispose();
  }
};

ko.components.register('user-avatar', {
  template: `
    <div class="user-avatar" data-uie-name="user-avatar" data-bind="attr: {title: user.name}, css: css_classes(), click: on_click, in_viewport: on_in_viewport, delay: delay">
      <div class="user-avatar-background"></div>
      <div class="user-avatar-initials" data-bind="text: initials"></div>
      <div class="user-avatar-image"></div>
      <div class="user-avatar-badge"></div>
      <div class="user-avatar-border"></div>
    </div>
  `,
  viewModel: {
    createViewModel(params, component_info) {
      return new z.components.UserAvatar(params, component_info);
    }
  }
});
