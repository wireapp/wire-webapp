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

z.components.UserProfile = class UserProfile {
  static get MODE() {
    return {
      SEARCH: 'UserProfile.MODE.SEARCH',
    };
  }

  constructor(params, componentInfo) {
    this.dispose = this.dispose.bind(this);

    this.logger = new z.util.Logger('z.components.UserProfile', z.config.LOGGER.OPTIONS);

    this.mode = UserProfile.MODE.SEARCH;
    this.userEntity = params.user;
    this.element = $(componentInfo.element);

    this.userRepository = window.wire.app.repository.user;

    this.selfUser = this.userRepository.self;

    this.hasUser = ko.pureComputed(() => typeof this.userEntity === 'function' && !!this.userEntity());

    this.isTeam = ko.pureComputed(() => this.selfUser().is_team_member());

    this.userAvailabilityLabel = ko.pureComputed(() => {
      if (this.userEntity()) {
        const availabilitySetToNone = this.userEntity().availability() === z.user.AvailabilityType.NONE;
        if (!availabilitySetToNone) {
          return z.user.AvailabilityMapper.nameFromType(this.userEntity().availability());
        }
      }
    });

    // Actions
    this.clickOnClose = () => {
      if (typeof params.close === 'function') {
        this.renderAvatar(false);
        params.close();
      }
    };

    this.clickOnPending = () => {
      if (this.hasUser()) {
        const isPendingRequest = this.userEntity().is_ignored() || this.userEntity().is_incoming_request();
        if (isPendingRequest && typeof params.pending === 'function') {
          return params.pending(this.userEntity());
        }
      }
    };

    this.clickToAcceptInvite = () => {
      if (this.hasUser() && typeof params.accept === 'function') {
        params.accept(this.userEntity());
      }
    };

    this.clickToIgnoreInvite = () => {
      if (this.hasUser() && typeof params.ignore === 'function') {
        params.ignore(this.userEntity());
      }
    };

    this.clickToSendRequest = () => {
      if (this.hasUser() && typeof params.connect === 'function') {
        params.connect(this.userEntity());
      }
    };

    this.clickToUnblock = () => {
      if (this.hasUser() && typeof params.unblock === 'function') {
        params.unblock(this.userEntity());
      }
    };

    this.renderAvatar = ko.observable(false);
    this.renderAvatarComputed = ko.computed(() => {
      const hasUserId = this.hasUser();

      // swap value to re-render avatar
      this.renderAvatar(false);
      window.setTimeout(() => this.renderAvatar(hasUserId), 0);
    });

    // footer
    this.getFooterTemplate = ko.pureComputed(() => {
      if (this.hasUser()) {
        const userEntity = this.userEntity();

        if (userEntity.is_blocked()) {
          return 'user-profile-footer-unblock';
        }

        if (userEntity.is_ignored() || userEntity.is_incoming_request()) {
          return 'user-profile-footer-ignore-accept';
        }

        if (userEntity.is_unknown()) {
          return 'user-profile-footer-add';
        }
      }

      return 'user-profile-footer-empty';
    });
  }

  dispose() {
    this.renderAvatarComputed.dispose();
  }
};

ko.components.register('user-profile', {
  template: {
    element: 'user-profile-template',
  },
  viewModel: {
    createViewModel(params, componentInfo) {
      return new z.components.UserProfile(params, componentInfo);
    },
  },
});
