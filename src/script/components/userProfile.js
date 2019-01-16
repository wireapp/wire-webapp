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

window.z = window.z || {};
window.z.components = z.components || {};

z.components.UserProfile = class UserProfile {
  constructor(params) {
    this.dispose = this.dispose.bind(this);

    this.logger = new z.util.Logger('z.components.UserProfile', z.config.LOGGER.OPTIONS);

    this.userEntity = params.user;

    this.hasUser = ko.pureComputed(() => typeof this.userEntity === 'function' && !!this.userEntity());

    // Actions
    this.clickOnClose = () => {
      if (typeof params.close === 'function') {
        this.renderAvatar(false);
        params.close();
      }
    };

    this.clickOnPending = () => {
      if (this.hasUser()) {
        const isPendingRequest = this.userEntity().isIgnored() || this.userEntity().isIncomingRequest();
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
      if (hasUserId) {
        this.renderAvatar(false);
        window.setTimeout(() => this.renderAvatar(hasUserId), 0);
      }
    });

    // footer
    this.getFooterTemplate = ko.pureComputed(() => {
      if (this.hasUser()) {
        const userEntity = this.userEntity();

        if (userEntity.isBlocked()) {
          return 'user-profile-footer-unblock';
        }

        if (userEntity.isIgnored() || userEntity.isIncomingRequest()) {
          return 'user-profile-footer-ignore-accept';
        }

        if (userEntity.isUnknown()) {
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
  template: `
    <div class="user-profile-transition">
      <!-- ko if: hasUser() -->
        <div class="user-profile-default">
          <div class="user-profile-header">
            <div class="name popover-title ellipsis" data-bind="text: userEntity().name(), attr: {'data-uie-uid': userEntity().id, 'data-uie-value': userEntity().name()}" data-uie-name="status-user"></div>
            <div class="username popover-meta label-username" data-bind="text: userEntity().username(), attr: {'data-uie-value': userEntity().name()}" data-uie-name="status-username"></div>
          </div>

          <div class="user-profile-details">
            <!-- ko if: renderAvatar() -->
              <div class="user-profile-details-avatar">
                <participant-avatar class="cursor-default" params="participant: userEntity, size: z.components.ParticipantAvatar.SIZE.X_LARGE" data-uie-name="status-profile-picture"></participant-avatar>
              </div>
            <!-- /ko -->
          </div>
          <div class="user-profile-footer">
            <!-- ko template: {name: getFooterTemplate} --><!-- /ko -->
          </div>
        </div>
      <!-- /ko -->
    </div>
  `,
  viewModel: z.components.UserProfile,
});
