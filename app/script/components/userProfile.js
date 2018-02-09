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

z.components.UserProfile = class UserProfile {
  static get DEVICE_MODE() {
    return {
      AVAILABLE: 'UserProfile.DEVICE_MODE.AVAILABLE',
      NONE: 'UserProfile.DEVICE_MODE.NONE',
      REQUESTING: 'UserProfile.DEVICE_MODE.REQUESTING',
    };
  }

  static get MODE() {
    return {
      DEFAULT: 'UserProfile.MODE.DEFAULT',
      PEOPLE: 'UserProfile.MODE.PEOPLE',
      SEARCH: 'USerProfile.MODE.SEARCH',
    };
  }

  static get TAB_MODE() {
    return {
      DETAILS: 'UserProfile.TAB_MODE.DETAILS',
      DEVICES: 'UserProfile.TAB_MODE.DEVICES',
    };
  }

  constructor(params, componentInfo) {
    this.dispose = this.dispose.bind(this);
    this.clickOnDevice = this.clickOnDevice.bind(this);

    this.logger = new z.util.Logger('z.components.UserProfile', z.config.LOGGER.OPTIONS);

    this.conversation = params.conversation;
    this.mode = params.mode || UserProfile.MODE.DEFAULT;
    this.userEntity = params.user;
    this.element = $(componentInfo.element);

    this.clientRepository = window.wire.app.repository.client;
    this.conversationRepository = window.wire.app.repository.conversation;
    this.cryptographyRepository = window.wire.app.repository.cryptography;
    this.userRepository = window.wire.app.repository.user;

    this.selfUser = this.userRepository.self;

    this.hasUser = ko.pureComputed(() => typeof this.userEntity === 'function' && this.userEntity());

    this.isTeam = ko.pureComputed(() => this.selfUser().is_team_member());

    this.userAvailabilityLabel = ko.pureComputed(() => {
      if (this.userEntity()) {
        const availabilitySetToNone = this.userEntity().availability() === z.user.AvailabilityType.NONE;
        if (!availabilitySetToNone) {
          return z.user.AvailabilityMapper.nameFromType(this.userEntity().availability());
        }
      }
    });

    // Confirmation dialog
    this.confirmDialog = undefined;

    // Devices
    this.devices = ko.observableArray();
    this.selectedDevice = ko.observable();
    this.fingerprintLocal = ko.observableArray([]);
    this.fingerprintRemote = ko.observableArray([]);
    this.isResettingSession = ko.observable(false);

    this.deviceMode = ko.observable(UserProfile.DEVICE_MODE.REQUESTING);
    this.deviceModeIsAvailable = ko.pureComputed(() => this.deviceMode() === UserProfile.DEVICE_MODE.AVAILABLE);
    this.deviceModeIsNone = ko.pureComputed(() => this.deviceMode() === UserProfile.DEVICE_MODE.NONE);

    // Tabs
    this.tabMode = ko.observable(UserProfile.TAB_MODE.DETAILS);
    this.tabModeIsDetails = ko.pureComputed(() => this.tabMode() === UserProfile.TAB_MODE.DETAILS);
    this.tabModeIsDevices = ko.pureComputed(() => this.tabMode() === UserProfile.TAB_MODE.DEVICES);
    this.tabModeIsDevices.subscribe(tabModeIsDevices => {
      if (this.hasUser() && tabModeIsDevices) {
        const userId = this.userEntity().id;
        this.clientRepository
          .getClientsByUserId(userId)
          .then(clientEntities => {
            const hasDevices = clientEntities.length > 0;
            const deviceMode = hasDevices ? UserProfile.DEVICE_MODE.AVAILABLE : UserProfile.DEVICE_MODE.NONE;
            this.deviceMode(deviceMode);
          })
          .catch(error => this.logger.error(`Unable to retrieve clients data for user '${user_id}': ${error}`));
      }
    });
    this.tabModeActiveCSS = ko.pureComputed(() => {
      if (this.tabModeIsDetails()) {
        return 'user-profile-tab-active-details';
      }
      return 'user-profile-tab-active-devices';
    });

    // destroy confirm dialog when user changes
    this.cleanupComputed = ko.computed(() => {
      if (this.hasUser() && this.confirmDialog) {
        this.confirmDialog.destroy();
      }

      this.deviceMode(UserProfile.DEVICE_MODE.REQUESTING);
      this.tabMode(UserProfile.TAB_MODE.DETAILS);
      this.selectedDevice(null);
      this.fingerprintRemote([]);
      this.isResettingSession(false);
    });

    this.showBackButton = ko.pureComputed(() => {
      if (typeof this.conversation === 'function') {
        return this.conversation().is_group();
      }
    });

    this.selectedDeviceSubscription = this.selectedDevice.subscribe(() => {
      if (this.selectedDevice()) {
        this.fingerprintLocal(this._formatFingerprint(this.cryptographyRepository.get_local_fingerprint()));
        this.fingerprintRemote([]);
        this.cryptographyRepository
          .get_remote_fingerprint(this.userEntity().id, this.selectedDevice().id)
          .then(fingerprint => this.fingerprintRemote(this._formatFingerprint(fingerprint)));
      }
    });

    const shortcut = z.ui.Shortcut.get_shortcut_tooltip(z.ui.ShortcutType.ADD_PEOPLE);
    this.addPeopleTooltip = z.l10n.text(z.string.tooltip_people_add, shortcut);

    this.deviceHeadline = ko.pureComputed(() => {
      return z.l10n.text(z.string.people_tabs_devices_headline, this.userEntity().first_name());
    });

    this.noDeviceHeadline = ko.pureComputed(() => {
      return z.l10n.text(z.string.people_tabs_no_devices_headline, this.userEntity().first_name());
    });

    this.detailMessage = ko.pureComputed(() => {
      const substitution = {user: z.util.escape_html(this.userEntity().first_name())};
      const text = z.l10n.text(z.string.people_tabs_device_detail_headline, substitution);

      const textWithHtmlTags = new RegExp('\\{\\{[^\\}]+\\}\\}[^\\{]+\\{\\{[^\\}]+\\}\\}');
      const textWithinHtmlTags = new RegExp('\\{\\{[^\\}]+\\}\\}', 'gm');

      const [pivot] = text.match(textWithHtmlTags) || [];
      const sanitizedText = z.util.StringUtil.splitAtPivotElement(text, pivot, pivot);

      return sanitizedText.map(element => {
        if (element.isStyled) {
          element.text = element.text.replace(textWithinHtmlTags, '');
        }
        return element;
      });
    });

    // Actions
    this.clickOnAddPeople = () => {
      if (this.hasUser() && typeof params.add_people === 'function') {
        params.add_people(this.userEntity());
      }
    };

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

      this.clickToOpenConversation();
    };

    this.clickOnShowProfile = () => {
      if (this.hasUser() && typeof params.profile === 'function') {
        params.profile(this.userEntity());
      }
    };

    this.clickToAcceptInvite = () => {
      if (this.hasUser() && typeof params.accept === 'function') {
        params.accept(this.userEntity());
      }
    };

    this.clickToBlock = () => {
      if (this.hasUser() && typeof params.block === 'function') {
        params.block(this.userEntity());
      }
    };

    this.clickToCancelRequest = () => {
      if (this.hasUser()) {
        amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT);

        this.confirmDialog = this.element.confirm({
          confirm: () => {
            const shouldBlock = this.element.find('.checkbox input').is(':checked');
            if (shouldBlock) {
              this.userRepository.block_user(this.userEntity());
            } else {
              this.userRepository.cancel_connection_request(this.userEntity());
            }

            this.conversationRepository.get_1to1_conversation(this.userEntity()).then(conversationEntity => {
              if (this.conversationRepository.is_active_conversation(conversationEntity)) {
                amplify.publish(z.event.WebApp.CONVERSATION.PEOPLE.HIDE);

                const nextConversationEntity = this.conversationRepository.get_next_conversation(conversationEntity);
                window.setTimeout(() => {
                  amplify.publish(z.event.WebApp.CONVERSATION.SHOW, nextConversationEntity);
                }, z.motion.MotionDuration.LONG);
              }
            });

            if (typeof params.cancel_request === 'function') {
              params.cancel_request(this.userEntity());
            }
          },
          data: {
            user: this.userEntity(),
          },
          template: '#template-confirm-cancel_request',
        });
      }
    };

    this.clickToIgnoreInvite = () => {
      if (this.hasUser() && typeof params.ignore === 'function') {
        params.ignore(this.userEntity());
      }
    };

    this.clickToLeaveConversation = () => {
      if (this.hasUser() && typeof params.leave === 'function') {
        params.leave(this.userEntity());
      }
    };

    this.clickToOpenConversation = () => {
      if (this.hasUser()) {
        amplify.publish(z.event.WebApp.CONVERSATION.PEOPLE.HIDE);

        this.conversationRepository.get_1to1_conversation(this.userEntity()).then(conversationEntity => {
          if (conversationEntity.is_archived()) {
            this.conversationRepository.unarchive_conversation(conversationEntity);
          }

          window.setTimeout(() => {
            amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity);

            if (typeof params.open === 'function') {
              params.open(this.userEntity());
            }
          }, z.motion.MotionDuration.LONG);
        });
      }
    };

    this.clickToRemoveFromConversation = () => {
      if (this.hasUser() && typeof params.remove === 'function') {
        params.remove(this.userEntity());
      }
    };

    this.clickToSendRequest = () => {
      if (this.hasUser()) {
        this.userRepository
          .create_connection(this.userEntity(), true)
          .then(() => amplify.publish(z.event.WebApp.CONVERSATION.PEOPLE.HIDE));
      }

      if (typeof params.connect === 'function') {
        params.connect(this.userEntity());
      }
    };

    this.clickToUnblock = () => {
      if (this.hasUser() && typeof params.unblock === 'function') {
        params.unblock(this.userEntity());
      }
    };

    this.accentColor = ko.pureComputed(() => {
      if (this.hasUser()) {
        return `accent-color-${this.hasUser().accent_id()}`;
      }
      return '';
    });

    this.showGrayImage = ko.pureComputed(() => {
      if (!this.hasUser()) {
        return false;
      }

      return !this.hasUser().is_me && !this.hasUser().is_connected();
    });

    this.connectionIsNotEstablished = ko.pureComputed(() => {
      if (this.hasUser()) {
        return this.hasUser().is_request() || this.hasUser().is_ignored();
      }
    });

    this.isUserRemovable = ko.pureComputed(() => {
      if (!this.hasUser() || !this.conversation()) {
        return false;
      }

      const participatingUserEntities = this.conversation().participating_user_ets();
      const isSelfParticipant = !this.conversation().removed_from_conversation() && !this.conversation().is_guest();
      const isUserParticipant = participatingUserEntities.includes(this.userEntity());
      return isSelfParticipant && isUserParticipant;
    });

    this.renderAvatar = ko.observable(false);
    this.renderAvatarComputed = ko.computed(() => {
      const hasUserId = this.hasUser();

      // swap value to re-render avatar
      this.renderAvatar(false);
      window.setTimeout(() => this.renderAvatar(hasUserId), 0);
    });

    // footer
    this.getFooterTemplate = ko.pureComputed(() => {
      if (!this.hasUser() || !this.tabModeIsDetails()) {
        return 'user-profile-footer-empty';
      }
      const userEntity = this.userEntity();

      // When used in conversation!
      if (typeof this.conversation === 'function') {
        const conversationEntity = this.conversation();

        if (conversationEntity.is_one2one() || conversationEntity.is_request()) {
          if (userEntity.is_me) {
            return 'user-profile-footer-profile';
          }

          if (userEntity.is_connected() || userEntity.is_team_member()) {
            return 'user-profile-footer-add-block';
          }

          if (userEntity.is_outgoing_request()) {
            return 'user-profile-footer-pending';
          }
        } else if (conversationEntity.is_group()) {
          if (userEntity.is_me) {
            return 'user-profile-footer-profile-leave';
          }

          if (userEntity.is_connected() || userEntity.is_team_member()) {
            return 'user-profile-footer-message-remove';
          }

          if (userEntity.is_unknown()) {
            return 'user-profile-footer-connect-remove';
          }

          if (userEntity.is_ignored() || userEntity.is_request()) {
            return 'user-profile-footer-pending-remove';
          }

          if (userEntity.is_blocked()) {
            return 'user-profile-footer-unblock-remove';
          }
        }
        // When used in Search!
      } else {
        if (userEntity.is_blocked()) {
          return 'user-profile-footer-unblock';
        }

        if (userEntity.is_outgoing_request()) {
          return 'user-profile-footer-pending';
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

  _formatFingerprint(fingerprint) {
    return z.util.zero_padding(fingerprint, 16).match(/.{1,2}/g) || [];
  }

  clickOnDevice(clientEntity) {
    this.selectedDevice(clientEntity);
  }

  clickOnDeviceDetailBack() {
    this.selectedDevice(null);
  }

  clickToSeeSelfFingerprint() {
    this.confirmDialog = $('#participants').confirm({
      data: {
        click_on_show_my_devices() {
          amplify.publish(z.event.WebApp.PREFERENCES.MANAGE_DEVICES);
        },
        device: this.clientRepository.currentClient,
        fingerprint_local: this.fingerprintLocal,
      },
      template: '#template-confirm-my-fingerprint',
    });
  }

  clickToResetSession() {
    const reset_progress = () => {
      window.setTimeout(() => {
        this.isResettingSession(false);
      }, z.motion.MotionDuration.LONG);
    };

    this.isResettingSession(true);
    this.conversationRepository
      .reset_session(this.userEntity().id, this.selectedDevice().id, this.conversation().id)
      .then(() => reset_progress())
      .catch(() => reset_progress());
  }

  clickToToggleDeviceVerification() {
    const toggleVerified = !this.selectedDevice().meta.is_verified();

    this.clientRepository
      .verifyClient(this.userEntity().id, this.selectedDevice(), toggleVerified)
      .catch(error => this.logger.warn(`Failed to toggle client verification: ${error.message}`));
  }

  clickOnTabDevices() {
    this.tabMode(UserProfile.TAB_MODE.DEVICES);
  }

  clickOnTabDetails() {
    this.tabMode(UserProfile.TAB_MODE.DETAILS);
  }

  dispose() {
    this.cleanupComputed.dispose();
    this.renderAvatarComputed.dispose();
    this.selectedDeviceSubscription.dispose();
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
