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

import {getLogger} from 'Util/Logger';
import {createRandomUuid} from 'Util/util';
import {getFirstChar} from 'Util/StringUtil';

import {viewportObserver} from '../ui/viewportObserver';
import {User} from '../entity/User';
import {ServiceEntity} from '../integration/ServiceEntity';

export class ParticipantAvatar {
  static get SIZE() {
    return {
      LARGE: 'avatar-l',
      MEDIUM: 'avatar-m',
      SMALL: 'avatar-s',
      XXX_SMALL: 'avatar-xxxs',
      XX_SMALL: 'avatar-xxs',
      X_LARGE: 'avatar-xl',
      X_SMALL: 'avatar-xs',
    };
  }

  static get DIAMETER() {
    return {
      [ParticipantAvatar.SIZE.LARGE]: 72,
      [ParticipantAvatar.SIZE.MEDIUM]: 40,
      [ParticipantAvatar.SIZE.SMALL]: 28,
      [ParticipantAvatar.SIZE.X_LARGE]: 200,
      [ParticipantAvatar.SIZE.X_SMALL]: 24,
      [ParticipantAvatar.SIZE.XX_SMALL]: 20,
      [ParticipantAvatar.SIZE.XXX_SMALL]: 16,
    };
  }

  constructor(params, componentInfo) {
    this.logger = getLogger('ParticipantAvatar');

    const isParticipantObservable = typeof params.participant === 'function';
    this.participant = isParticipantObservable ? params.participant : ko.observable(params.participant);

    this.isService = ko.pureComputed(() => {
      return this.participant() instanceof ServiceEntity || this.participant().isService;
    });

    this.isUser = ko.pureComputed(() => {
      return this.participant() instanceof User && !this.participant().isService;
    });

    this.isTemporaryGuest = ko.pureComputed(() => this.isUser() && this.participant().isTemporaryGuest());

    this.remainingTimer = undefined;

    this.avatarType = ko.pureComputed(() => `${this.isUser() ? 'user' : 'service'}-avatar`);
    this.delay = params.delay;
    this.size = params.size || ParticipantAvatar.SIZE.LARGE;
    this.element = $(componentInfo.element);
    this.element.addClass(`${this.avatarType()} ${this.size}`);

    const borderScale = 0.9916;
    const finalBorderWidth = this.size === ParticipantAvatar.SIZE.X_LARGE ? 4 : 1;
    this.borderWidth = (finalBorderWidth / ParticipantAvatar.DIAMETER[this.size]) * 32;
    this.borderRadius = (16 - this.borderWidth / 2) * borderScale;
    this.timerLength = this.borderRadius * Math.PI * 2;
    this.timerOffset = ko.observable();

    this.timerOffset = ko.pureComputed(() => {
      if (this.isTemporaryGuest()) {
        const remainingTime = this.participant().expirationRemaining();
        const normalizedRemainingTime = remainingTime / User.CONFIG.TEMPORARY_GUEST.LIFETIME;
        return this.timerLength * (normalizedRemainingTime - 1);
      }
      return 0;
    });

    this.avatarLoadingBlocked = false;
    this.avatarEnteredViewport = false;

    this.dispose = this.dispose.bind(this);

    this.element.attr({
      id: createRandomUuid(),
      'user-id': this.participant().id,
    });

    this.initials = ko.pureComputed(() => {
      if (this.isService()) {
        return '';
      }

      return this.element.hasClass('avatar-xs')
        ? getFirstChar(this.participant().initials())
        : this.participant().initials();
    });

    this.state = ko.pureComputed(() => {
      switch (true) {
        case this.isService():
          return '';
        case this.participant().is_me:
          return 'self';
        case typeof params.selected === 'function' && params.selected():
          return 'selected';
        case this.participant().isTeamMember():
          return '';
        case this.participant().isBlocked():
          return 'blocked';
        case this.participant().isRequest():
          return 'pending';
        case this.participant().isIgnored():
          return 'ignored';
        case this.participant().isCanceled() || this.participant().isUnknown():
          return 'unknown';
        default:
          return '';
      }
    });

    this.cssClasses = ko.pureComputed(() => {
      if (this.isService()) {
        return 'accent-color-service';
      }

      return this.isTemporaryGuest()
        ? 'accent-color-temporary'
        : `accent-color-${this.participant().accent_id()} ${this.state()}`;
    });

    this.onClick = (data, event) => {
      if (typeof params.click === 'function') {
        params.click(data.participant, event.currentTarget.parentNode);
      }
    };

    const _loadAvatarPicture = () => {
      this.element.find('.avatar-image').html('');
      this.element.removeClass('avatar-image-loaded avatar-loading-transition');
      if (!this.avatarLoadingBlocked) {
        this.avatarLoadingBlocked = true;

        const isSmall = this.size !== ParticipantAvatar.SIZE.LARGE && this.size !== ParticipantAvatar.SIZE.X_LARGE;
        const loadHiRes = !isSmall && window.devicePixelRatio > 1;
        const pictureResource = loadHiRes
          ? this.participant().mediumPictureResource()
          : this.participant().previewPictureResource();

        if (pictureResource) {
          const isCached = pictureResource.downloadProgress() === 100;

          pictureResource
            .getObjectUrl()
            .then(url => {
              if (url) {
                const image = new Image();
                image.src = url;
                this.element.find('.avatar-image').html(image);
                this.element.addClass(`avatar-image-loaded ${isCached && isSmall ? '' : 'avatar-loading-transition'}`);
              }
              this.avatarLoadingBlocked = false;
            })
            .catch(error => {
              this.logger.warn('Failed to load avatar picture.', error);
            });
        } else {
          this.avatarLoadingBlocked = false;
        }
      }
    };

    const _onInViewport = () => {
      this.avatarEnteredViewport = true;
      _loadAvatarPicture();
    };

    const _loadAvatarPictureIfVisible = () => {
      if (this.avatarEnteredViewport) {
        _loadAvatarPicture();
      }
    };

    viewportObserver.onElementInViewport(componentInfo.element, _onInViewport);

    this.pictureSubscription = this.participant().mediumPictureResource.subscribe(_loadAvatarPictureIfVisible);
    this.participantSubscription = this.participant.subscribe(_loadAvatarPictureIfVisible);
  }

  dispose() {
    viewportObserver.removeElement(this.element[0]);
    this.participantSubscription.dispose();
    this.pictureSubscription.dispose();
  }
}

ko.components.register('participant-avatar', {
  template: `
    <div class="participant-avatar" data-bind="attr: {title: participant().name, 'data-uie-name': avatarType()}, css: cssClasses(), click: onClick, delay: delay">
      <div class="avatar-background"></div>
      <!-- ko if: isUser -->
        <div class="avatar-initials" data-bind="text: initials()"></div>
      <!-- /ko -->
      <!-- ko if: isService -->
        <div class="avatar-service-placeholder">
            <service-icon></service-icon>
        </div>
      <!-- /ko -->
      <div class="avatar-image"></div>
      <!-- ko if: isUser -->
        <div class="avatar-badge"></div>
      <!-- /ko -->
      <div class="avatar-border"></div>
      <!-- ko if: isTemporaryGuest() -->
        <svg class="avatar-temporary-guest-border" viewBox="0 0 32 32" data-bind="attr: {stroke: participant().accent_color()}">
          <circle cx="16" cy="16" transform="rotate(-90 16 16)" fill="none"
             data-bind="attr: {'stroke-dasharray': timerLength, 'stroke-dashoffset': timerOffset, 'r': borderRadius, 'stroke-width': borderWidth}">
          </circle>
        </svg>
      <!-- /ko -->
    </div>
    `,
  viewModel: {
    createViewModel(params, componentInfo) {
      return new ParticipantAvatar(params, componentInfo);
    },
  },
});
