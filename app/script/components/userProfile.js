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

z.components.UserProfileMode = {
  DEFAULT: 'default',
  PEOPLE: 'people',
  SEARCH: 'search',
};

z.components.UserProfileViewModel = class UserProfileViewModel {
  constructor(params, component_info) {
    const SHOW_CONVERSATION_DELAY = 550;

    this.dispose = this.dispose.bind(this);
    this.click_on_device = this.click_on_device.bind(this);

    this.logger = new z.util.Logger('z.components.UserProfileViewModel', z.config.LOGGER.OPTIONS);

    this.user = params.user;
    this.conversation = params.conversation;
    this.mode = params.mode || z.components.UserProfileMode.DEFAULT;

    // repository references
    this.client_repository = wire.app.repository.client;
    this.conversation_repository = wire.app.repository.conversation;
    this.cryptography_repository = wire.app.repository.cryptography;
    this.user_repository = wire.app.repository.user;

    this.isTeam = ko.pureComputed(() => {
      return this.conversation()
        .self()
        .is_team_member();
    });
    this.userAvailabilityLabel = ko.pureComputed(() => {
      const availabilitySetToNone = this.user().availability() === z.user.AvailabilityType.NONE;
      if (!availabilitySetToNone) {
        return z.user.AvailabilityMapper.nameFromType(this.user().availability());
      }
    });

    // component dom element
    this.element = $(component_info.element);

    // actions
    this.on_accept = () => {
      if (typeof params.accept === 'function') {
        params.accept(this.user());
      }
    };
    this.on_add_people = () => {
      if (typeof params.add_people === 'function') {
        params.add_people(this.user());
      }
    };
    this.on_block = () => {
      if (typeof params.block === 'function') {
        params.block(this.user());
      }
    };
    this.on_close = function() {
      if (typeof params.close === 'function') {
        params.close();
      }
    };
    this.on_ignore = () => {
      if (typeof params.ignore === 'function') {
        params.ignore(this.user());
      }
    };
    this.on_leave = () => {
      if (typeof params.leave === 'function') {
        params.leave(this.user());
      }
    };
    this.on_profile = () => {
      if (typeof params.profile === 'function') {
        params.profile(this.user());
      }
    };
    this.on_remove = () => {
      if (typeof params.remove === 'function') {
        params.remove(this.user());
      }
    };
    this.on_unblock = () => {
      if (typeof params.unblock === 'function') {
        params.unblock(this.user());
      }
    };

    // cancel request confirm dialog
    this.confirm_dialog = undefined;

    // tabs
    this.click_on_tab = index => this.tab_index(index);
    this.tab_index = ko.observable(0);
    this.tab_index.subscribe(this.on_tab_index_changed.bind(this));

    // devices
    this.devices = ko.observableArray();
    this.devices_found = ko.observable();
    this.selected_device = ko.observable();
    this.fingerprint_remote = ko.observable('');
    this.fingerprint_local = ko.observable('');
    this.is_resetting_session = ko.observable(false);

    // destroy confirm dialog when user changes
    this.cleanup_computed = ko.computed(() => {
      if (this.user() && this.confirm_dialog) {
        this.confirm_dialog.destroy();
      }
      this.tab_index(0);
      this.devices_found(null);
      this.selected_device(null);
      this.fingerprint_remote('');
      this.is_resetting_session(false);
    });

    this.show_back_button = ko.pureComputed(() => {
      if (typeof this.conversation === 'function') {
        return this.conversation().is_group();
      }
    });

    this.selected_device_subscription = this.selected_device.subscribe(() => {
      if (this.selected_device()) {
        this.fingerprint_local(this.cryptography_repository.get_local_fingerprint());
        this.fingerprint_remote('');
        this.cryptography_repository
          .get_remote_fingerprint(this.user().id, this.selected_device().id)
          .then(fingerprint => this.fingerprint_remote(fingerprint));
      }
    });

    const shortcut = z.ui.Shortcut.get_shortcut_tooltip(z.ui.ShortcutType.ADD_PEOPLE);
    this.add_people_tooltip = z.l10n.text(z.string.tooltip_people_add, shortcut);

    this.device_headline = ko.pureComputed(() => {
      return z.l10n.text(z.string.people_tabs_devices_headline, this.user().first_name());
    });

    this.no_device_headline = ko.pureComputed(() => {
      return z.l10n.text(z.string.people_tabs_no_devices_headline, this.user().first_name());
    });

    this.detail_message = ko.pureComputed(() => {
      return z.l10n.text(z.string.people_tabs_device_detail_headline, {
        html1: "<span class='user-profile-device-detail-highlight'>",
        html2: '</span>',
        user: z.util.escape_html(this.user().first_name()),
      });
    });

    this.on_cancel_request = () => {
      amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT);

      this.confirm_dialog = this.element.confirm({
        confirm: () => {
          const should_block = this.element.find('.checkbox input').is(':checked');
          if (should_block) {
            this.user_repository.block_user(this.user());
          } else {
            this.user_repository.cancel_connection_request(this.user());
          }

          this.conversation_repository.get_1to1_conversation(this.user()).then(conversation_et => {
            if (this.conversation_repository.is_active_conversation(conversation_et)) {
              amplify.publish(z.event.WebApp.CONVERSATION.PEOPLE.HIDE);
              const next_conversation_et = this.conversation_repository.get_next_conversation(conversation_et);
              window.setTimeout(() => {
                amplify.publish(z.event.WebApp.CONVERSATION.SHOW, next_conversation_et);
              }, SHOW_CONVERSATION_DELAY);
            }
          });

          if (typeof params.cancel_request === 'function') {
            params.cancel_request(this.user());
          }
        },
        data: {
          user: this.user(),
        },
        template: '#template-confirm-cancel_request',
      });
    };

    this.on_open = () => {
      amplify.publish(z.event.WebApp.CONVERSATION.PEOPLE.HIDE);

      this.conversation_repository.get_1to1_conversation(this.user()).then(conversation_et => {
        if (conversation_et.is_archived()) {
          this.conversation_repository.unarchive_conversation(conversation_et);
        }

        window.setTimeout(() => {
          amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversation_et);
          if (typeof params.open === 'function') {
            params.open(this.user());
          }
        }, SHOW_CONVERSATION_DELAY);
      });
    };

    this.on_connect = () => {
      this.user_repository
        .create_connection(this.user(), true)
        .then(() => amplify.publish(z.event.WebApp.CONVERSATION.PEOPLE.HIDE));

      if (typeof params.connect === 'function') {
        params.connect(this.user());
      }
    };

    this.on_pending = () => {
      if (this.user().is_ignored() || this.user().is_incoming_request()) {
        if (typeof params.pending === 'function') {
          params.pending(this.user());
        }
      } else {
        this.on_open();
      }
    };

    this.accent_color = ko.pureComputed(() => {
      if (this.user()) {
        return `accent-color-${this.user().accent_id()}`;
      }
    });

    this.show_gray_image = ko.pureComputed(() => {
      if (!this.user()) {
        return false;
      }

      return !this.user().is_me && !this.user.is_connected();
    });

    this.connection_is_not_established = ko.pureComputed(() => {
      if (this.user()) {
        return this.user().is_request() || this.user().is_ignored();
      }
    });

    this.user_is_removed_from_conversation = ko.pureComputed(() => {
      if (!this.user() || !this.conversation()) {
        return true;
      }

      const participating_user_ets = this.conversation().participating_user_ets();
      return !participating_user_ets.includes(this.user());
    });

    this.render_avatar = ko.observable(false);
    this.render_avatar_computed = ko.computed(() => {
      const has_user_id = !!this.user();

      // swap value to re-render avatar
      this.render_avatar(false);
      window.setTimeout(() => {
        this.render_avatar(has_user_id);
      }, 0);
    });

    // footer
    this.get_footer_template = ko.pureComputed(() => {
      const user_et = this.user();
      if (!user_et || this.tab_index() === 1) {
        return 'user-profile-footer-empty';
      }

      // When used in conversation!
      if (typeof this.conversation === 'function') {
        const conversation_et = this.conversation();

        if (conversation_et.is_one2one() || conversation_et.is_request()) {
          if (user_et.is_me) {
            return 'user-profile-footer-profile';
          }

          if (user_et.is_connected() || conversation_et.team_id) {
            return 'user-profile-footer-add-block';
          }

          if (user_et.is_outgoing_request()) {
            return 'user-profile-footer-pending';
          }
        } else if (conversation_et.is_group()) {
          if (user_et.is_me) {
            return 'user-profile-footer-profile-leave';
          }

          if (user_et.is_connected() || user_et.is_team_member()) {
            return 'user-profile-footer-message-remove';
          }

          if (user_et.is_unknown()) {
            return 'user-profile-footer-connect-remove';
          }

          if (user_et.is_ignored() || user_et.is_request()) {
            return 'user-profile-footer-pending-remove';
          }

          if (user_et.is_blocked()) {
            return 'user-profile-footer-unblock-remove';
          }
        }
        // When used in Search!
      } else {
        if (user_et.is_blocked()) {
          return 'user-profile-footer-unblock';
        }

        if (user_et.is_outgoing_request()) {
          return 'user-profile-footer-pending';
        }

        if (user_et.is_ignored() || this.user().is_incoming_request()) {
          return 'user-profile-footer-ignore-accept';
        }

        if (user_et.is_unknown()) {
          return 'user-profile-footer-add';
        }
      }

      return 'user-profile-footer-empty';
    });
  }

  click_on_device(client_et) {
    this.selected_device(client_et);
  }

  click_on_device_detail_back_button() {
    this.selected_device(null);
  }

  click_on_my_fingerprint_button() {
    this.confirm_dialog = $('#participants').confirm({
      data: {
        click_on_show_my_devices() {
          amplify.publish(z.event.WebApp.PREFERENCES.MANAGE_DEVICES);
        },
        device: this.client_repository.current_client,
        fingerprint_local: this.fingerprint_local,
      },
      template: '#template-confirm-my-fingerprint',
    });
  }

  click_on_reset_session() {
    const reset_progress = () => {
      window.setTimeout(() => {
        this.is_resetting_session(false);
      }, 550);
    };

    this.is_resetting_session(true);
    this.conversation_repository
      .reset_session(this.user().id, this.selected_device().id, this.conversation().id)
      .then(() => reset_progress())
      .catch(() => reset_progress());
  }

  click_on_verify_client() {
    const toggle_verified = !this.selected_device().meta.is_verified();

    this.client_repository
      .verify_client(this.user().id, this.selected_device(), toggle_verified)
      .catch(error => this.logger.warn(`Client cannot be updated: ${error.message}`));
  }

  on_tab_index_changed(index) {
    if (index === 1) {
      const user_id = this.user().id;
      this.client_repository
        .get_clients_by_user_id(user_id)
        .then(client_ets => this.devices_found(client_ets.length > 0))
        .catch(error => this.logger.error(`Unable to retrieve clients data for user '${user_id}': ${error}`));
    }
  }

  dispose() {
    this.cleanup_computed.dispose();
    this.render_avatar_computed.dispose();
    this.selected_device_subscription.dispose();
  }
};

ko.components.register('user-profile', {
  template: {
    element: 'user-profile-template',
  },
  viewModel: {
    createViewModel(params, component_info) {
      return new z.components.UserProfileViewModel(params, component_info);
    },
  },
});
