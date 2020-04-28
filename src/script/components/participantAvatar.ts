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

import {getLogger, Logger} from 'Util/Logger';
import {createRandomUuid} from 'Util/util';
import {getFirstChar} from 'Util/StringUtil';

import {viewportObserver} from '../ui/viewportObserver';
import {User} from '../entity/User';
import {ServiceEntity} from '../integration/ServiceEntity';
import {AssetRemoteData} from '../assets/AssetRemoteData';

export enum SIZE {
  LARGE = 'avatar-l',
  MEDIUM = 'avatar-m',
  SMALL = 'avatar-s',
  XXX_SMALL = 'avatar-xxxs',
  XX_SMALL = 'avatar-xxs',
  X_LARGE = 'avatar-xl',
  X_SMALL = 'avatar-xs',
}

enum STATE {
  SELF = 'self',
  SELECTED = 'selected',
  BLOCKED = 'blocked',
  PENDING = 'pending',
  IGNORED = 'ignored',
  UNKNOWN = 'unknown',
  NONE = '',
}

interface ParticipantAvatarParams {
  selected: any;
  click: any;
  participant?: ko.Observable<User> | User;
  delay?: number;
  size?: SIZE;
}

export class ParticipantAvatar {
  logger: Logger;
  participant: ko.Observable<User>;
  isService: ko.PureComputed<boolean>;
  isUser: ko.PureComputed<boolean>;
  isTemporaryGuest: ko.PureComputed<boolean>;
  remainingTimer: any;
  avatarType: ko.PureComputed<string>;
  delay: number;
  size: SIZE;
  element: JQuery<HTMLElement>;
  borderWidth: number;
  borderRadius: number;
  timerLength: number;
  timerOffset: ko.PureComputed<number>;
  avatarLoadingBlocked: boolean;
  avatarEnteredViewport: boolean;
  initials: ko.PureComputed<string>;
  state: ko.PureComputed<STATE>;
  cssClasses: ko.PureComputed<string>;
  onClick: (data: any, event: Event) => void;
  pictureSubscription: ko.Subscription;
  participantSubscription: ko.Subscription;

  static get SIZE(): typeof SIZE {
    return SIZE;
  }

  static get DIAMETER() {
    return {
      [SIZE.LARGE]: 72,
      [SIZE.MEDIUM]: 40,
      [SIZE.SMALL]: 28,
      [SIZE.X_LARGE]: 200,
      [SIZE.X_SMALL]: 24,
      [SIZE.XX_SMALL]: 20,
      [SIZE.XXX_SMALL]: 16,
    };
  }

  constructor(params: ParticipantAvatarParams, componentInfo: {element: HTMLElement}) {
    this.logger = getLogger('ParticipantAvatar');

    const isParticipantObservable = typeof params.participant === 'function';
    this.participant = isParticipantObservable
      ? (params.participant as ko.Observable<User>)
      : ko.observable(params.participant as User);

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
    this.size = params.size || SIZE.LARGE;
    this.element = $(componentInfo.element);
    this.element.addClass(`${this.avatarType()} ${this.size}`);

    const borderScale = 0.9916;
    const finalBorderWidth = this.size === SIZE.X_LARGE ? 4 : 1;
    this.borderWidth = (finalBorderWidth / ParticipantAvatar.DIAMETER[this.size]) * 32;
    this.borderRadius = (16 - this.borderWidth / 2) * borderScale;
    this.timerLength = this.borderRadius * Math.PI * 2;

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
          return STATE.NONE;
        case this.participant().isMe:
          return STATE.SELF;
        case typeof params.selected === 'function' && params.selected():
          return STATE.SELECTED;
        case this.participant().isTeamMember():
          return STATE.NONE;
        case this.participant().isBlocked():
          return STATE.BLOCKED;
        case this.participant().isRequest():
          return STATE.PENDING;
        case this.participant().isIgnored():
          return STATE.IGNORED;
        case this.participant().isCanceled() || this.participant().isUnknown():
          return STATE.UNKNOWN;
        default:
          return STATE.NONE;
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
        params.click(data.participant, (event.currentTarget as Node).parentNode);
      }
    };

    const _loadAvatarPicture = () => {
      this.element.find('.avatar-image').html('');
      this.element.removeClass('avatar-image-loaded avatar-loading-transition');
      if (!this.avatarLoadingBlocked) {
        this.avatarLoadingBlocked = true;

        const isSmall = this.size !== SIZE.LARGE && this.size !== SIZE.X_LARGE;
        const loadHiRes = !isSmall && window.devicePixelRatio > 1;
        const pictureResource: AssetRemoteData = loadHiRes
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
                this.element.find('.avatar-image').html(image as any);
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
    createViewModel(params: ParticipantAvatarParams, componentInfo: {element: HTMLElement}) {
      return new ParticipantAvatar(params, componentInfo);
    },
  },
});
