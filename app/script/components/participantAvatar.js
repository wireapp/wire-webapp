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

z.components.ParticipantAvatar = class ParticipantAvatar {
  static SIZE() {
    return {
      LARGE: 'ParticipantAvatar.SIZE.LARGE',
      MEDIUM: 'ParticipantAvatar.SIZE.MEDIUM',
      SMALL: 'ParticipantAvatar.SIZE.SMALL',
      X_SMALL: 'ParticipantAvatar.SIZE.X_SMALL',
      XX_SMALL: 'ParticipantAvatar.SIZE.XX_SMALL',
    };
  }

  constructor(params, componentInfo) {
    this.participant = ko.unwrap(params.participant);
    this.isService = this.participant instanceof z.integration.ServiceEntity || this.participant.isBot;
    this.isUser = this.participant instanceof z.entity.User && !this.participant.isBot;

    const avatarType = `${this.isUser ? 'user' : 'service'}-avatar`;
    this.delay = params.delay;
    this.size = params.size || ParticipantAvatar.SIZE.MEDIA_STREAM_ERROR;
    this.element = $(componentInfo.element);

    if (this.size) {
      this.element.addClass(`${avatarType} avatar-${this.size}`);
    }

    this.avatarLoadingBlocked = false;
    this.avatarEnteredViewport = false;

    this.dispose = this.dispose.bind(this);

    this.element.attr({
      id: z.util.create_random_uuid(),
      'user-id': this.participant.id,
    });

    this.element.find('.participant-avatar').data('uie-name', avatarType);

    this.initials = ko.pureComputed(() => {
      if (this.isService) {
        return '';
      }
      if (this.element.hasClass('avatar-xs')) {
        return z.util.StringUtil.get_first_character(this.participant.initials());
      }
      return this.participant.initials();
    });

    this.state = ko.pureComputed(() => {
      switch (true) {
        case this.isService:
          return '';
        case this.participant.is_me:
          return 'self';
        case typeof params.selected === 'function' && params.selected():
          return 'selected';
        case this.participant.is_team_member():
          return '';
        case this.participant.is_blocked():
          return 'blocked';
        case this.participant.is_request():
          return 'pending';
        case this.participant.is_ignored():
          return 'ignored';
        case this.participant.is_canceled() || this.participant.is_unknown():
          return 'unknown';
        default:
          return '';
      }
    });

    this.cssClasses = ko.pureComputed(() => {
      return this.isService ? 'accent-color-bot' : `accent-color-${this.participant.accent_id()} ${this.state()}`;
    });

    this.onClick = (data, event) => {
      if (typeof params.click === 'function') {
        params.click(data.participant, event.currentTarget.parentNode);
      }
    };

    this.onInViewport = () => {
      this.avatarEnteredViewport = true;
      this._loadAvatarPicture();
      return true;
    };

    this._loadAvatarPicture = () => {
      if (!this.avatarLoadingBlocked) {
        this.avatarLoadingBlocked = true;
        if (this.participant.previewPictureResource()) {
          this.participant
            .previewPictureResource()
            .get_object_url()
            .then(url => {
              const image = new Image();
              image.src = url;
              this.element.find('.avatar-image').html(image);
              this.element.addClass('avatar-image-loaded avatar-loading-transition');
              this.avatarLoadingBlocked = false;
            });
        }
      }
    };

    this.picturePreviewSubscription = this.participant.previewPictureResource.subscribe(() => {
      if (this.avatarEnteredViewport) {
        this._loadAvatarPicture();
      }
    });
  }

  dispose() {
    this.picturePreviewSubscription.dispose();
  }
};

ko.components.register('participant-avatar', {
  template: `
    <div class="participant-avatar" data-bind="attr: {title: participant.name}, css: cssClasses(), click: onClick, in_viewport: onInViewport, delay: delay">
      <!-- ko if: isUser -->
        <div class="avatar-initials" data-bind="text: initials"></div>
      <!-- /ko -->
      <!-- ko if: isService -->
        <div class="avatar-service-placeholder">
            <svg width="32" height="32" viewBox="0 0 32 32">
              <path d="M10.5 12A6.5 6.5 0 0 0 4 18.5V24a1 1 0 0 0 1 1h22a1 1 0 0 0 1-1v-5.5a6.5 6.5 0 0 0-6.5-6.5h-11zm-7.12-1.22L.24 4.95a2 2 0 1 1 3.52-1.9L6.8 8.68C7.94 8.24 9.19 8 10.5 8h11C27.3 8 32 12.7 32 18.5V24a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5v-5.5c0-3.05 1.3-5.8 3.38-7.72zM11 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0m7 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0m5 2a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm5.26-9.55a2 2 0 0 1-3.52-1.9l3.5-6.5a2 2 0 0 1 3.52 1.9l-3.5 6.5z"/>
            </svg>
        </div>
      <!-- /ko -->
      <div class="avatar-image"></div>
      <!-- ko if: isUser -->
        <div class="avatar-badge"></div>
      <!-- /ko -->
      <div class="avatar-border"></div>
    </div>
    `,
  viewModel: {
    createViewModel(params, componentInfo) {
      return new z.components.ParticipantAvatar(params, componentInfo);
    },
  },
});
