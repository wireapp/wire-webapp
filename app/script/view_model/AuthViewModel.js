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
window.z.ViewModel = z.ViewModel || {};

// @formatter:off
z.ViewModel.AuthViewModel = class AuthViewModel {
  static get CONFIG() {
    return {
      ANIMATION_TIMEOUT: {
        LONG: 2000,
        SHORT: 500,
      },
      FORWARDED_URL_PARAMETERS: [
        z.auth.URLParameter.BOT,
        z.auth.URLParameter.ENVIRONMENT,
        z.auth.URLParameter.LOCALYTICS,
      ],
    };
  }

  /**
   * View model for the auth page.
   *
   * @param {string} element_id - CSS class of the element where this view should be applied to (like "auth-page")
   * @param {z.main.Auth} auth - App authentication
   */
  constructor(element_id, auth) {
    this.click_on_remove_device_submit = this.click_on_remove_device_submit.bind(this);

    this.auth = auth;
    this.logger = new z.util.Logger('z.ViewModel.AuthViewModel', z.config.LOGGER.OPTIONS);

    this.event_tracker = new z.tracking.EventTrackingRepository();

    this.audio_repository = this.auth.audio;

    // Cryptography
    this.asset_service = new z.assets.AssetService(this.auth.client);
    // @todo Don't operate with the service directly. Get a repository!
    this.storage_service = new z.storage.StorageService();
    this.storage_repository = new z.storage.StorageRepository(this.storage_service);

    this.cryptography_service = new z.cryptography.CryptographyRepository(this.auth.client);
    this.cryptography_repository = new z.cryptography.CryptographyRepository(this.cryptography_service, this.storage_repository);
    this.client_service = new z.client.ClientService(this.auth.client, this.storage_service);
    this.client_repository = new z.client.ClientRepository(this.client_service, this.cryptography_repository);

    this.user_mapper = new z.user.UserMapper(this.asset_service);
    this.user_service = new z.user.UserService(this.auth.client);
    this.user_repository = new z.user.UserRepository(this.user_service, this.asset_service, undefined, this.client_repository);

    this.notification_service = new z.event.NotificationService(this.auth.client, this.storage_service);
    this.web_socket_service = new z.event.WebSocketService(this.auth.client);
    this.event_repository = new z.event.EventRepository(this.web_socket_service, this.notification_service, this.cryptography_repository, this.user_repository);

    this.pending_server_request = ko.observable(false);
    this.disabled_by_animation = ko.observable(false);

    this.get_wire = ko.observable(false);
    this.session_expired = ko.observable(false);
    this.device_reused = ko.observable(false);

    this.country_code = ko.observable('');
    this.country = ko.observable('');
    this.name = ko.observable('');
    this.password = ko.observable('');
    this.persist = ko.observable(true);
    this.phone_number = ko.observable('');
    this.username = ko.observable('');

    this.is_public_computer = ko.observable(false);
    this.is_public_computer.subscribe((is_public_computer) => this.persist(!is_public_computer));

    this.client_type = ko.pureComputed(() => {
      if (this.persist()) {
        return z.client.ClientType.PERMANENT;
      }

      return z.client.ClientType.TEMPORARY;
    });

    this.self_user = ko.observable();

    // Manage devices
    this.remove_form_error = ko.observable(false);
    this.device_modal = undefined;
    this.permanent_devices = ko.pureComputed(() => {
      return this.client_repository.clients()
        .filter((client_et) => client_et.type === z.client.ClientType.PERMANENT);
    });

    this.registration_context = z.auth.AuthView.REGISTRATION_CONTEXT.EMAIL;
    this.prefilled_email = '';

    this.code_digits = ko.observableArray([
      ko.observable(''),
      ko.observable(''),
      ko.observable(''),
      ko.observable(''),
      ko.observable(''),
      ko.observable(''),
    ]);
    this.code = ko.pureComputed(() => {
      return this.code_digits()
        .map((digit) => digit())
        .join('')
        .substr(0, 6);
    });
    this.code.subscribe((code) => {
      if (!code.length) {
        this._clear_errors();
      }

      if (code.length === 6) {
        this.verify_code();
      }
    });
    this.phone_number_e164 = () => `${this.country_code()}${this.phone_number()}`;

    this.code_interval_id = undefined;

    this.code_expiration_timestamp = ko.observable(0);
    this.code_expiration_in = ko.observable('');
    this.code_expiration_timestamp.subscribe((timestamp) => {
      this.code_expiration_in(moment.unix(timestamp).fromNow());
      this.code_interval_id = window.setInterval(() => {
        if (timestamp <= z.util.get_unix_timestamp()) {
          window.clearInterval(this.code_interval_id);
          return this.code_expiration_timestamp(0);
        }
        this.code_expiration_in(moment.unix(timestamp).fromNow());
      }, 20000);
    });

    this.validation_errors = ko.observableArray([]);
    this.failed_validation_email = ko.observable(false);
    this.failed_validation_password = ko.observable(false);
    this.failed_validation_name = ko.observable(false);
    this.failed_validation_code = ko.observable(false);
    this.failed_validation_phone = ko.observable(false);
    this.failed_validation_terms = ko.observable(false);
    this.accepted_terms_of_use = ko.observable(false);
    this.accepted_terms_of_use.subscribe(() => this.clear_error(z.auth.AuthView.TYPE.TERMS));

    this.can_login_password = ko.pureComputed(() => {
      return !this.disabled_by_animation();
    });

    this.can_login_phone = ko.pureComputed(() => {
      return !this.disabled_by_animation() && (this.country_code().length > 1) && this.phone_number().length;
    });

    this.can_register = ko.pureComputed(() => {
      return !this.disabled_by_animation() && this.username().length && this.name().length && this.password().length && this.accepted_terms_of_use();
    });

    this.can_resend_code = ko.pureComputed(() => {
      return !this.disabled_by_animation() && (this.code_expiration_timestamp() < z.util.get_unix_timestamp());
    });

    this.can_resend_registration = ko.pureComputed(() => !this.disabled_by_animation() && this.username().length);

    this.can_resend_verification = ko.pureComputed(() => !this.disabled_by_animation() && this.username().length);

    this.can_verify_password = ko.pureComputed(() => !this.disabled_by_animation() && this.password().length);

    this.account_retry_text = ko.pureComputed(() => {
      return z.localization.Localizer.get_text({
        id: z.string.auth_posted_retry,
        replace: {
          content: this.username(),
          placeholder: '%email',
        },
      });
    });

    this.account_resend_text = ko.pureComputed(() => {
      return z.localization.Localizer.get_text({
        id: z.string.auth_posted_resend,
        replace: {
          content: this.username(),
          placeholder: '%email',
        },
      });
    });

    this.verify_code_text = ko.pureComputed(() => {
      const phone_number = PhoneFormat.formatNumberForMobileDialing('', this.phone_number_e164()) || this.phone_number_e164();
      return z.localization.Localizer.get_text({
        id: z.string.auth_verify_code_description,
        replace: {
          content: phone_number,
          placeholder: '%@number',
        },
      });
    });

    this.verify_code_timer_text = ko.pureComputed(() => {
      return z.localization.Localizer.get_text({
        id: z.string.auth_verify_code_resend_timer,
        replace: {
          content: this.code_expiration_in(),
          placeholder: '%expiration',
        },
      });
    });

    this.visible_section = ko.observable(undefined);
    this.visible_mode = ko.observable(undefined);
    this.visible_method = ko.observable(undefined);

    this.account_mode = ko.observable(undefined);
    this.account_mode_login = ko.pureComputed(() => {
      const login_modes = [
        z.auth.AuthView.MODE.ACCOUNT_LOGIN,
        z.auth.AuthView.MODE.ACCOUNT_PASSWORD,
        z.auth.AuthView.MODE.ACCOUNT_PHONE,
      ];
      return login_modes.includes(this.account_mode());
    });

    this.posted_mode = ko.observable(undefined);
    this.posted_mode_offline = ko.pureComputed(() => this.posted_mode() === z.auth.AuthView.MODE.POSTED_OFFLINE);
    this.posted_mode_pending = ko.pureComputed(() => this.posted_mode() === z.auth.AuthView.MODE.POSTED_PENDING);
    this.posted_mode_resend = ko.pureComputed(() => this.posted_mode() === z.auth.AuthView.MODE.POSTED_RESEND);
    this.posted_mode_retry = ko.pureComputed(() => this.posted_mode() === z.auth.AuthView.MODE.POSTED_RETRY);
    this.posted_mode_verify = ko.pureComputed(() => this.posted_mode() === z.auth.AuthView.MODE.POSTED_VERIFY);

    // Debugging
    if (z.util.Environment.frontend.is_localhost()) {
      const live_reload = document.createElement('script');
      live_reload.id = 'live_reload';
      live_reload.src = 'http://localhost:32123/livereload.js';
      document.body.appendChild(live_reload);
      $('html').addClass('development');
    }

    ko.applyBindings(this, document.getElementById(element_id));

    this.show_initial_animation = false;
    this.tabs_check_interval_id = undefined;
    this.tabs_check_hash = undefined;

    this._init_base();
    this._track_app_launch();
    $(`.${element_id}`).show();
  }

  _init_base() {
    $(window)
      .on('dragover drop', () => false)
      .on('hashchange', this._on_hash_change.bind(this))
      .on('keydown', this.keydown_auth.bind(this));

    this._init_page();

    // Select country based on location of user IP
    this.country_code((z.util.CountryCodes.get_country_code($('[name=geoip]').attr('country')) || 1).toString());
    this.changed_country_code();

    this.audio_repository.init();
  }

  _init_page() {
    this._check_single_instance()
      .then(() => {
        this._init_url_parameter();
        this._init_url_hash();
      })
      .catch((error) => {
        if (error.message !== z.main.App.CONFIG.COOKIE_ERROR) {
          throw error;
        }
      });
  }

  _init_url_hash() {
    const modes_to_block = [
      z.auth.AuthView.MODE.HISTORY,
      z.auth.AuthView.MODE.LIMIT,
      z.auth.AuthView.MODE.MULTIPLE_TABS,
      z.auth.AuthView.MODE.POSTED,
      z.auth.AuthView.MODE.POSTED_PENDING,
      z.auth.AuthView.MODE.POSTED_RETRY,
      z.auth.AuthView.MODE.POSTED_VERIFY,
      z.auth.AuthView.MODE.VERIFY_ACCOUNT,
      z.auth.AuthView.MODE.VERIFY_CODE,
      z.auth.AuthView.MODE.VERIFY_PASSWORD,
    ];

    if (this._has_no_hash() && z.util.StorageUtil.get_value(z.storage.StorageKey.AUTH.SHOW_LOGIN)) {
      return this._set_hash(z.auth.AuthView.MODE.ACCOUNT_LOGIN);
    }

    if (modes_to_block.includes(this._get_hash())) {
      return this._set_hash(z.auth.AuthView.MODE.ACCOUNT_LOGIN);
    }

    return this._on_hash_change();
  }

  _init_url_parameter() {
    const is_connect = z.util.get_url_parameter(z.auth.URLParameter.CONNECT);
    if (is_connect) {
      this.get_wire(true);
      return this.registration_context = z.auth.AuthView.REGISTRATION_CONTEXT.GENERIC_INVITE;
    }

    const invite = z.util.get_url_parameter(z.auth.URLParameter.INVITE);
    if (invite) {
      this.get_wire(true);
      return this.register_from_invite(invite);
    }

    const is_expired = z.util.get_url_parameter(z.auth.URLParameter.EXPIRED);
    if (is_expired) {
      this.session_expired(true);
    }
  }


  //##############################################################################
  // Multiple tabs check
  //##############################################################################

  /**
   * Check that this is the single instance tab of the app.
   * @param {boolean} [set_check_interval=true] - Set check interval
   * @returns {Promise} Resolves when page is the first tab
   */
  _check_single_instance(set_check_interval = true) {
    if (Cookies.get(z.main.App.CONFIG.COOKIE_NAME)) {
      this._handle_multiple_tabs(set_check_interval);
      return Promise.reject(new Error(z.main.App.CONFIG.COOKIE_ERROR));
    }

    if (set_check_interval) {
      this._set_tabs_check_interval();
    }
    return Promise.resolve();
  }

  _clear_tabs_check_interval() {
    window.clearInterval(this.tabs_check_interval_id);
    this.tabs_check_interval_id = undefined;
  }

  _handle_multiple_tabs(set_check_interval) {
    const current_hash = this._get_hash();
    const is_multiple_tabs_hash = current_hash === z.auth.AuthView.MODE.MULTIPLE_TABS;

    if (!is_multiple_tabs_hash) {
      if (!this.tabs_check_hash) {
        this.tabs_check_hash = current_hash;
        this._set_hash(z.auth.AuthView.MODE.MULTIPLE_TABS);
      }

      if (set_check_interval) {
        this._set_tabs_recheck_interval();
      }
    }
  }

  _set_tabs_check_interval() {
    this._clear_tabs_check_interval();

    this.tabs_check_interval_id = window.setInterval(() => {
      this._check_single_instance()
        .catch((error) => {
          if (error.message !== z.main.App.CONFIG.COOKIE_ERROR) {
            throw error;
          }
          this._handle_multiple_tabs();
        });
    }, 500);
  }

  _set_tabs_recheck_interval() {
    this._clear_tabs_check_interval();

    this.tabs_check_interval_id = window.setInterval(() => {
      this._check_single_instance(false)
        .then(() => {
          this._set_tabs_check_interval();
          this._init_url_parameter();

          if (this.tabs_check_hash) {
            this._set_hash(this.tabs_check_hash);
            return this.tabs_check_hash = undefined;
          }

          this._init_url_hash();
        })
        .catch((error) => {
          if (error.message !== z.main.App.CONFIG.COOKIE_ERROR) {
            throw error;
          }
        });
    }, 500);
  }


  //##############################################################################
  // Invitation Stuff
  //##############################################################################

  register_from_invite(invite) {
    this.auth.repository.retrieve_invite(invite)
      .then((invite_info) => {
        this.registration_context = z.auth.AuthView.REGISTRATION_CONTEXT.PERSONAL_INVITE;
        this.name(invite_info.name);
        if (invite_info.email) {
          this.username(invite_info.email);
          this.prefilled_email = invite_info.email;
        }
      })
      .catch(function(error) {
        if (error.label !== z.service.BackendClientError.LABEL.INVALID_INVITATION_CODE) {
          return Raygun.send(new Error('Invitation not found'), {error: error, invite_code: invite});
        }
      })
      .then(() => {
        this._set_hash(z.auth.AuthView.MODE.ACCOUNT_REGISTER);
      });
  }


  //##############################################################################
  // Form actions
  //##############################################################################

  /**
   * Sign in using a password login.
   * @returns {undefined} No return value
   */
  login_password() {
    if (!this.pending_server_request() && this.can_login_password() && this._validate_input(z.auth.AuthView.MODE.ACCOUNT_PASSWORD)) {
      this.pending_server_request(true);
      const payload = this._create_payload(z.auth.AuthView.MODE.ACCOUNT_PASSWORD);

      this.auth.repository.login(payload, this.persist())
        .then(() => {
          const login_context = payload.email ? z.auth.AuthView.TYPE.EMAIL : z.auth.AuthView.TYPE.PHONE;
          amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.LOGGED_IN, {context: login_context, remember_me: this.persist()});
          this._authentication_successful();
        })
        .catch((error) => {
          this.pending_server_request(false);
          $('#wire-login-password').focus();

          if (navigator.onLine) {
            if (error.label) {
              if (error.label === z.service.BackendClientError.LABEL.PENDING_ACTIVATION) {
                return this._set_hash(z.auth.AuthView.MODE.POSTED_PENDING);
              }
              this._add_error(z.string.auth_error_sign_in, [z.auth.AuthView.TYPE.EMAIL, z.auth.AuthView.TYPE.PASSWORD]);
            } else {
              this._add_error(z.string.auth_error_misc);
            }
          } else {
            this._add_error(z.string.auth_error_offline);
          }
          this._has_errors();
        });
    }
  }

  /**
   * Sign in using a phone number.
   * @returns {undefined} No return value
   */
  login_phone() {
    if (!this.pending_server_request() && this.can_login_phone() && this._validate_input(z.auth.AuthView.MODE.ACCOUNT_PHONE)) {
      const _on_code_request_success = (response) => {
        window.clearInterval(this.code_interval_id);
        if (response.expires_in) {
          this.code_expiration_timestamp(z.util.get_unix_timestamp() + response.expires_in);
        } else if (!response.label) {
          this.code_expiration_timestamp(z.util.get_unix_timestamp() + z.config.LOGIN_CODE_EXPIRATION);
        }
        this._set_hash(z.auth.AuthView.MODE.VERIFY_CODE);
        this.pending_server_request(false);
      };

      this.pending_server_request(true);
      const payload = this._create_payload(z.auth.AuthView.MODE.ACCOUNT_PHONE);

      this.auth.repository.request_login_code(payload)
        .then((response) => _on_code_request_success(response))
        .catch((error) => {
          this.pending_server_request(false);
          if (navigator.onLine) {
            switch (error.label) {
              case z.service.BackendClientError.LABEL.BAD_REQUEST:
                this._add_error(z.string.auth_error_phone_number_invalid, z.auth.AuthView.TYPE.PHONE);
                break;
              case z.service.BackendClientError.LABEL.INVALID_PHONE:
                this._add_error(z.string.auth_error_phone_number_unknown, z.auth.AuthView.TYPE.PHONE);
                break;
              case z.service.BackendClientError.LABEL.PASSWORD_EXISTS:
                this._set_hash(z.auth.AuthView.MODE.VERIFY_PASSWORD);
                break;
              case z.service.BackendClientError.LABEL.PENDING_LOGIN:
                _on_code_request_success(error);
                break;
              case z.service.BackendClientError.LABEL.UNAUTHORIZED:
                this._add_error(z.string.auth_error_phone_number_forbidden, z.auth.AuthView.TYPE.PHONE);
                break;
              default:
                this._add_error(z.string.auth_error_misc);
            }
          } else {
            this._add_error(z.string.auth_error_offline);
          }
          this._has_errors();
        });
    }
  }


  /**
   * Register a new user account.
   * @returns {undefined} No return value
   */
  register() {
    if (!this.pending_server_request() && this.can_register() && this._validate_input(z.auth.AuthView.MODE.ACCOUNT_REGISTER)) {
      this.pending_server_request(true);
      this.persist(true);
      const payload = this._create_payload(z.auth.AuthView.MODE.ACCOUNT_REGISTER);

      this.auth.repository.register(payload)
        .then(() => {
          this.get_wire(false);
          amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.REGISTRATION.ENTERED_CREDENTIALS, {outcome: 'success'});

          // Track if the user changed the pre-filled email
          if (this.prefilled_email === this.username()) {
            this.auth.repository.get_access_token()
              .then(() => this._account_verified());
          } else {
            this._set_hash(z.auth.AuthView.MODE.POSTED);
            this.auth.repository.get_access_token()
              .then(() => this._wait_for_activate());
          }
          this.pending_server_request(false);
        })
        .catch((error) => this._on_register_error(error));
    }
  }

  /**
   * Add an email on phone number login.
   * @returns {undefined} No return value
   */
  verify_account() {
    if (!this.pending_server_request() && this.can_login_password() && this._validate_input(z.auth.AuthView.MODE.VERIFY_ACCOUNT)) {
      this.pending_server_request(true);

      this.user_service.change_own_password(this.password())
        .catch((error) => {
          this.logger.warn('Could not change user password', error);
          if (error.code !== z.service.BackendClientError.STATUS_CODE.FORBIDDEN) {
            throw error;
          }
        })
        .then(() => this.user_service.change_own_email(this.username()))
        .then(() => {
          this.pending_server_request(false);
          this._wait_for_update();
          this._set_hash(z.auth.AuthView.MODE.POSTED_VERIFY);
        })
        .catch((error) => {
          this.pending_server_request(false);
          if (error) {
            switch (error.label) {
              case z.service.BackendClientError.LABEL.BLACKLISTED_EMAIL:
                this._add_error(z.string.auth_error_email_forbidden, z.auth.AuthView.TYPE.EMAIL);
                break;
              case z.service.BackendClientError.LABEL.KEY_EXISTS:
                this._add_error(z.string.auth_error_email_exists, z.auth.AuthView.TYPE.EMAIL);
                break;
              case z.service.BackendClientError.LABEL.INVALID_EMAIL:
                this._add_error(z.string.auth_error_email_malformed, z.auth.AuthView.TYPE.EMAIL);
                break;
              default:
                this._add_error(z.string.auth_error_email_malformed, z.auth.AuthView.TYPE.EMAIL);
            }
            return this._has_errors();
          }
        });
    }
  }

  /**
   * Verify the security code on phone number login.
   * @returns {undefined} No return value
   */
  verify_code() {
    if (!this.pending_server_request() && this._validate_code()) {
      this.pending_server_request(true);
      const payload = this._create_payload(z.auth.AuthView.MODE.VERIFY_CODE);

      this.auth.repository.login(payload, this.persist())
        .then(() => {
          amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.LOGGED_IN, {context: z.auth.AuthView.TYPE.PHONE, remember_me: this.persist()});
          this._authentication_successful();
        })
        .catch(() => {
          if (!this.validation_errors().length) {
            this._add_error(z.string.auth_error_code, z.auth.AuthView.TYPE.CODE);
            this._has_errors();
          }
          this.pending_server_request(false);
        });
    }
  }

  /**
   * Log in with phone number and password.
   * @returns {undefined} No return value
   */
  verify_password() {
    if (!this.pending_server_request() && this._validate_input(z.auth.AuthView.MODE.VERIFY_PASSWORD)) {
      this.pending_server_request(true);
      const payload = this._create_payload(z.auth.AuthView.MODE.VERIFY_PASSWORD);

      this.auth.repository.login(payload, this.persist())
        .then(() => {
          amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.LOGGED_IN, {context: z.auth.AuthView.TYPE.PHONE, remember_me: this.persist()});
          this._authentication_successful();
        })
        .catch((error) => {
          this.pending_server_request(false);
          $('#wire-verify-password').focus();
          if (navigator.onLine) {
            if (error.label) {
              if (error.label === z.service.BackendClientError.LABEL.PENDING_ACTIVATION) {
                return this._set_hash(z.auth.AuthView.MODE.POSTED_PENDING);
              }
              this._add_error(z.string.auth_error_sign_in, z.auth.AuthView.TYPE.PASSWORD);
            } else {
              this._add_error(z.string.auth_error_misc);
            }
          } else {
            this._add_error(z.string.auth_error_offline);
          }
          this._has_errors();
        });
    }
  }

  /**
   * Create the backend call payload.
   *
   * @private
   * @param {z.auth.AuthView.MODE} mode - View state of the authentication page
   * @returns {Object} Auth payload for specified mode
   */
  _create_payload(mode) {
    let payload = {};
    const username = this.username()
      .trim()
      .toLowerCase();

    switch (mode) {
      case z.auth.AuthView.MODE.ACCOUNT_PASSWORD: {
        payload = {
          label: this.client_repository.construct_cookie_label(username, this.client_type()),
          label_key: this.client_repository.construct_cookie_label_key(username, this.client_type()),
          password: this.password(),
        };

        const phone = z.util.phone_number_to_e164(username, this.country() || navigator.language);
        if (z.util.is_valid_email(username)) {
          payload.email = username;
        } else if (z.util.is_valid_username(username)) {
          payload.handle = username.replace('@', '');
        } else if (z.util.is_valid_phone_number(phone)) {
          payload.phone = phone;
        }
        break;
      }

      case z.auth.AuthView.MODE.ACCOUNT_PHONE: {
        payload = {
          force: false,
          phone: this.phone_number_e164(),
        };
        break;
      }

      case z.auth.AuthView.MODE.ACCOUNT_REGISTER: {
        payload = {
          email: username,
          invitation_code: z.util.get_url_parameter(z.auth.URLParameter.INVITE),
          label: this.client_repository.construct_cookie_label(username, this.client_type()),
          label_key: this.client_repository.construct_cookie_label_key(username, this.client_type()),
          locale: moment.locale(),
          name: this.name().trim(),
          password: this.password(),
        };
        break;
      }

      case z.auth.AuthView.MODE.POSTED_RESEND: {
        payload = {
          email: username,
        };
        break;
      }

      case z.auth.AuthView.MODE.VERIFY_CODE: {
        payload = {
          code: this.code(),
          label: this.client_repository.construct_cookie_label(this.phone_number_e164(), this.client_type()),
          label_key: this.client_repository.construct_cookie_label_key(this.phone_number_e164(), this.client_type()),
          phone: this.phone_number_e164(),
        };
        break;
      }

      case z.auth.AuthView.MODE.VERIFY_PASSWORD: {
        payload = {
          label: this.client_repository.construct_cookie_label(this.phone_number_e164(), this.client_type()),
          label_key: this.client_repository.construct_cookie_label_key(this.phone_number_e164(), this.client_type()),
          password: this.password(),
          phone: this.phone_number_e164(),
        };
        break;
      }

      default:
        this.logger.warn(`Unsupported payload of type '${mode}' requested`);
    }
    return payload;
  }


  //##############################################################################
  // Events
  //##############################################################################

  changed_country(view_model, event) {
    this.clear_error(z.auth.AuthView.TYPE.PHONE);

    const country = event ? event.currentTarget.value || undefined : this.country();
    this.country_code(`+${z.util.CountryCodes.get_country_code(country)}`);
    $('#wire-login-phone').focus();
  }

  changed_country_code(view_model, event) {
    let country_iso;
    const country_code_value = event ? event.currentTarget.value : undefined || this.country_code();
    const country_code_matches = country_code_value.match(/\d+/g) || [];
    const country_code = country_code_matches.join('').substr(0, 4);

    if (country_code) {
      this.country_code(`+${country_code}`);
      country_iso = z.util.CountryCodes.get_country_by_code(country_code) || 'X1';
    } else {
      this.country_code('');
      country_iso = 'X0';
    }

    this.country(country_iso);
    $('#wire-login-phone').focus();
  }

  changed_phone_number() {
    const input_value = this.phone_number();
    const phone_number_matches = this.phone_number().match(/\d+/g) || [];
    const phone_number = phone_number_matches.join('');

    this.phone_number(phone_number);

    if (input_value.length && !this.phone_number().length) {
      this._add_error(z.string.auth_error_phone_number_invalid, z.auth.AuthView.TYPE.PHONE);
    }
  }

  clear_error(mode, event) {
    const error_mode = event ? event.currentTarget.classList[1] : undefined || mode;
    this._remove_error(error_mode);
  }

  clear_error_password(view_model, event) {
    if (event.keyCode !== z.util.KEYCODE.ENTER) {
      this.failed_validation_password(false);
      if (!event.currentTarget.value.length || (event.currentTarget.value.length >= 8)) {
        this._remove_error(event.currentTarget.classList[1]);
      }
    }
  }

  clicked_on_change_email() {
    this._set_hash(z.auth.AuthView.MODE.ACCOUNT_REGISTER);
  }

  clicked_on_change_phone() {
    this._set_hash(z.auth.AuthView.MODE.ACCOUNT_PHONE);
  }

  clicked_on_login() {
    this._set_hash(z.auth.AuthView.MODE.ACCOUNT_LOGIN);
    if (this.visible_method() === z.auth.AuthView.MODE.ACCOUNT_PHONE) {
      $('#wire-login-phone').focus_field();
    }
  }

  clicked_on_login_password() {
    this._set_hash(z.auth.AuthView.MODE.ACCOUNT_PASSWORD);
  }

  clicked_on_login_phone() {
    this._set_hash(z.auth.AuthView.MODE.ACCOUNT_PHONE);
  }

  clicked_on_password() {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.PASSWORD_RESET, {value: 'fromSignIn'});
    z.util.safe_window_open(`${z.util.Environment.backend.website_url()}${z.l10n.text(z.string.url_password_reset)}`);
  }

  clicked_on_register() {
    this._set_hash(z.auth.AuthView.MODE.ACCOUNT_REGISTER);
  }

  clicked_on_resend_code() {
    if (this.can_resend_code()) {
      this.login_phone();
    }
  }

  clicked_on_resend_registration() {
    if (this.can_resend_registration()) {
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.REGISTRATION.RESENT_EMAIL_VERIFICATION);
      this._fade_in_icon_spinner();

      if (!this.pending_server_request()) {
        this.pending_server_request(true);
        const payload = this._create_payload(z.auth.AuthView.MODE.POSTED_RESEND);

        this.auth.repository.resend_activation(payload)
        .then((response) => this._on_resend_success(response))
        .catch((error) => this._on_resend_error(error));
      }
    }
  }

  clicked_on_resend_verification() {
    if (this.can_resend_verification) {
      this._fade_in_icon_spinner();

      if (!this.pending_server_request()) {
        this.pending_server_request(true);

        this.user_service.change_own_email(this.username())
          .then((response) => this._on_resend_success(response))
          .catch(() => {
            this.pending_server_request(false);
            $('.icon-spinner').fadeOut();
            window.setTimeout(() => {
              $('.icon-error').fadeIn();
              this.disabled_by_animation(false);
            }, AuthViewModel.CONFIG.ANIMATION_TIMEOUT.SHORT);
          });
      }
    }
  }

  clicked_on_retry_registration() {
    if (this.can_register()) {
      this._fade_in_icon_spinner();

      if (!this.pending_server_request()) {
        this.pending_server_request(true);
        const payload = this._create_payload(z.auth.AuthView.MODE.ACCOUNT_REGISTER);

        this.auth.repository.register(payload)
          .then((response) => this._on_resend_success(response))
          .catch((error) => this._on_resend_error(error));
      }
    }
  }

  clicked_on_terms() {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.NAVIGATION.OPENED_TERMS);
    z.util.safe_window_open(z.l10n.text(z.string.url_terms_of_use));
  }

  clicked_on_verify_later() {
    this._authentication_successful();
  }

  clicked_on_wire_link() {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.NAVIGATION.OPENED_WIRE_WEBSITE);
    z.util.safe_window_open(z.l10n.text(z.string.url_wire));
  }

  keydown_auth(event) {
    if (event.keyCode === z.util.KEYCODE.ENTER) {
      switch (this.visible_mode()) {
        case z.auth.AuthView.MODE.ACCOUNT_LOGIN: {
          if (this.visible_method() === z.auth.AuthView.MODE.ACCOUNT_PHONE) {
            return this.login_phone();
          }
          this.login_password();
          break;
        }

        case z.auth.AuthView.MODE.ACCOUNT_PASSWORD:
          this.login_password();
          break;

        case z.auth.AuthView.MODE.ACCOUNT_PHONE:
          this.login_phone();
          break;

        case z.auth.AuthView.MODE.ACCOUNT_REGISTER:
          this.register();
          break;

        case z.auth.AuthView.MODE.VERIFY_ACCOUNT:
          this.verify_account();
          break;

        case z.auth.AuthView.MODE.VERIFY_PASSWORD:
          this.verify_password();
          break;

        case z.auth.AuthView.MODE.LIMIT:
          if (!this.device_modal || this.device_modal.is_hidden()) {
            this.clicked_on_manage_devices();
          }
          break;

        case z.auth.AuthView.MODE.HISTORY:
          this.click_on_history_confirm();
          break;

        default:
          break;
      }
    }
  }

  keydown_phone_code(view_model, event) {
    const combo_key = z.util.Environment.os.win ? event.ctrlKey : event.metaKey;
    if (combo_key && (event.keyCode === z.util.KEYCODE.KEY_V)) {
      return true;
    }

    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return false;
    }

    const target_id = event.currentTarget.id;
    const target_digit = window.parseInt(target_id.substr(target_id.length - 1));

    let focus_digit;
    switch (event.keyCode) {
      case z.util.KEYCODE.ARROW_LEFT:
      case z.util.KEYCODE.ARROW_UP:
        focus_digit = target_digit - 1;
        $(`#wire-verify-code-digit-${Math.max(1, focus_digit)}`).focus();
        break;

      case z.util.KEYCODE.ARROW_DOWN:
      case z.util.KEYCODE.ARROW_RIGHT:
        focus_digit = target_digit + 1;
        $(`#wire-verify-code-digit-${Math.min(6, focus_digit)}`).focus();
        break;

      case z.util.KEYCODE.BACKSPACE:
      case z.util.KEYCODE.DELETE:
        if (event.currentTarget.value === '') {
          focus_digit = target_digit - 1;
          $(`#wire-verify-code-digit-${Math.max(1, focus_digit)}`).focus();
        }
        return true;

      default: {
        const char = String.fromCharCode(event.keyCode).match(/\d+/g) || String.fromCharCode(event.keyCode - 48).match(/\d+/g);

        if (char) {
          this.code_digits()[target_digit - 1](char);
          focus_digit = target_digit + 1;
          $(`#wire-verify-code-digit-${Math.min(6, focus_digit)}`).focus();
        }
      }
    }
  }

  input_phone_code(view_model, event) {
    const target_id = event.currentTarget.id;
    const target_digit = window.parseInt(target_id.substr(target_id.length - 1));
    const array_digit = target_digit - 1;
    const target_value_matches = event.currentTarget.value.match(/\d+/g) || [];
    const input_value = target_value_matches.join('');

    if (input_value) {
      const focus_digit = target_digit + input_value.length;
      $(`#wire-phone-code-digit-${Math.min(6, focus_digit)}`).focus();
      const digits = input_value.substr(0, 6 - array_digit).split('');
      digits.map((digit, index) => this.code_digits()[array_digit + index](digit));
    } else {
      this.code_digits()[array_digit](null);
    }
  }

  clicked_on_manage_devices() {
    if (!this.device_modal) {
      this.device_modal = new zeta.webapp.module.Modal('#modal-limit');
    }

    if (this.device_modal.is_hidden()) {
      this.client_repository.get_clients_for_self();
    }

    this.device_modal.toggle();
  }

  close_model_manage_devices() {
    this.device_modal.toggle();
  }

  click_on_remove_device_submit(password, device) {
    this.client_repository.delete_client(device.id, password)
      .then(() => {
        return this._register_client();
      })
      .then(() => {
        this.device_modal.toggle();
      })
      .catch((error) => {
        this.remove_form_error(true);
        this.logger.error(`Unable to replace device: ${error.message}`, error);
      });
  }

  click_on_history_confirm() {
    this._redirect_to_app();
  }


  //##############################################################################
  // Callbacks
  //##############################################################################

  _on_register_error(error) {
    this.pending_server_request(false);

    switch (error.label) {
      case z.service.BackendClientError.LABEL.BLACKLISTED_EMAIL:
      case z.service.BackendClientError.LABEL.UNAUTHORIZED:
        this._add_error(z.string.auth_error_email_forbidden, z.auth.AuthView.TYPE.EMAIL);
        break;

      case z.service.BackendClientError.LABEL.KEY_EXISTS: {
        const payload = this._create_payload(z.auth.AuthView.MODE.ACCOUNT_PASSWORD);

        this.auth.repository.login(payload, this.persist())
          .then(() => {
            amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.LOGGED_IN, {context: z.auth.AuthView.MODE.ACCOUNT_REGISTER, remember_me: this.persist()});
            this._authentication_successful();
          })
          .catch(() => {
            this._add_error(z.string.auth_error_email_exists, z.auth.AuthView.TYPE.EMAIL);
            this._has_errors();
          });
        return;
      }

      case z.service.BackendClientError.LABEL.MISSING_IDENTITY:
        this._add_error(z.string.auth_error_email_missing, z.auth.AuthView.TYPE.EMAIL);
        break;

      default:
        break;
    }

    if (this._has_errors()) {
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.REGISTRATION.ENTERED_CREDENTIALS, {outcome: 'fail', reason: error.label});
      return;
    }

    this.get_wire(false);
    if (navigator.onLine) {
      return this._set_hash(z.auth.AuthView.MODE.POSTED_RETRY);
    }

    this._set_hash(z.auth.AuthView.MODE.POSTED_OFFLINE);
  }

  _on_resend_error(error) {
    this.pending_server_request(false);
    $('.icon-spinner').fadeOut();

    window.setTimeout(() => {
      $('.icon-error').fadeIn();
      this._on_register_error(error);
      this.disabled_by_animation(false);
    }, AuthViewModel.CONFIG.ANIMATION_TIMEOUT.SHORT);
  }

  _on_resend_success() {
    this.pending_server_request(false);
    $('.icon-spinner').fadeOut();

    window.setTimeout(() => {
      $('.icon-check').fadeIn();
      if (this.posted_mode() === z.auth.AuthView.MODE.POSTED_RETRY) {
        this.posted_mode(z.auth.AuthView.MODE.POSTED_RESEND);
      }
    }, AuthViewModel.CONFIG.ANIMATION_TIMEOUT.SHORT);

    window.setTimeout(() => {
      $('.icon-check').fadeOut();
      $('.icon-envelope').fadeIn();
      this.disabled_by_animation(false);
    }, AuthViewModel.CONFIG.ANIMATION_TIMEOUT.LONG);
  }

  _wait_for_activate() {
    this.logger.info('Opened WebSocket connection to wait for account activation');

    this.web_socket_service.connect((notification) => {
      const [event] = notification.payload;

      this.logger.info(`»» Event: '${event.type}'`, {event_json: JSON.stringify(event), event_object: event});
      if (event.type === z.event.Backend.USER.ACTIVATE) {
        this._account_verified();
      }
    });
  }

  _wait_for_update() {
    this.logger.info('Opened WebSocket connection to wait for user update');

    this.web_socket_service.connect((notification) => {
      const [event] = notification.payload;

      this.logger.info(`»» Event: '${event.type}'`, {event_json: JSON.stringify(event), event_object: event});
      if ((event.type === z.event.Backend.USER.UPDATE) && event.user.email) {
        this._account_verified(false);
      }
    });
  }


  //##############################################################################
  // Views and Navigation
  //##############################################################################

  _show_account_login() {
    const switch_params = {
      focus: 'wire-login-username',
      mode: z.auth.AuthView.MODE.ACCOUNT_LOGIN,
      section: z.auth.AuthView.SECTION.ACCOUNT,
    };

    this.switch_ui(switch_params);
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.OPENED_LOGIN, {context: this.visible_method()});
  }

  _show_account_password() {
    const switch_params = {
      focus: 'wire-login-username',
      method: z.auth.AuthView.MODE.ACCOUNT_PASSWORD,
      mode: z.auth.AuthView.MODE.ACCOUNT_LOGIN,
      section: z.auth.AuthView.SECTION.ACCOUNT,
    };

    this.switch_ui(switch_params);
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.OPENED_LOGIN, {context: z.auth.AuthView.TYPE.EMAIL});
  }

  _show_account_phone() {
    const switch_params = {
      focus: 'wire-login-phone',
      method: z.auth.AuthView.MODE.ACCOUNT_PHONE,
      mode: z.auth.AuthView.MODE.ACCOUNT_LOGIN,
      section: z.auth.AuthView.SECTION.ACCOUNT,
    };

    this.switch_ui(switch_params);
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.OPENED_LOGIN, {context: z.auth.AuthView.TYPE.PHONE});
  }

  _show_account_register(focus = 'wire-register-name') {
    const switch_params = {
      focus: focus,
      mode: z.auth.AuthView.MODE.ACCOUNT_REGISTER,
      section: z.auth.AuthView.SECTION.ACCOUNT,
    };

    this.switch_ui(switch_params);
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.REGISTRATION.OPENED_EMAIL_SIGN_UP, {context: this.registration_context});
  }

  _show_history() {
    const switch_params = {
      mode: z.auth.AuthView.MODE.HISTORY,
      section: z.auth.AuthView.SECTION.HISTORY,
    };

    this.switch_ui(switch_params);
  }

  _show_limit() {
    const switch_params = {
      mode: z.auth.AuthView.MODE.LIMIT,
      section: z.auth.AuthView.SECTION.LIMIT,
    };

    this.switch_ui(switch_params);
  }

  _show_tabs() {
    const switch_params = {
      mode: z.auth.AuthView.MODE.MULTIPLE_TABS,
      section: z.auth.AuthView.SECTION.MULTIPLE_TABS,
    };

    this.switch_ui(switch_params);
  }

  _show_posted_offline() {
    this._show_icon_error();

    const switch_params = {
      mode: z.auth.AuthView.MODE.POSTED_OFFLINE,
      section: z.auth.AuthView.SECTION.POSTED,
    };

    this.switch_ui(switch_params);
  }

  _show_posted_pending() {
    this._show_icon_envelope();

    const switch_params = {
      mode: z.auth.AuthView.MODE.POSTED_PENDING,
      section: z.auth.AuthView.SECTION.POSTED,
    };

    this.switch_ui(switch_params);
  }

  _show_posted_resend() {
    this._show_icon_envelope();

    const switch_params = {
      mode: z.auth.AuthView.MODE.POSTED_RESEND,
      section: z.auth.AuthView.SECTION.POSTED,
    };

    this.switch_ui(switch_params);
  }

  _show_posted_retry() {
    this._show_icon_error();

    const switch_params = {
      mode: z.auth.AuthView.MODE.POSTED_RETRY,
      section: z.auth.AuthView.SECTION.POSTED,
    };

    this.switch_ui(switch_params);
  }

  _show_posted_verify() {
    this._show_icon_envelope();

    const switch_params = {
      mode: z.auth.AuthView.MODE.POSTED_VERIFY,
      section: z.auth.AuthView.SECTION.POSTED,
    };

    this.switch_ui(switch_params);
  }

  _show_verify_account() {
    const switch_params = {
      focus: 'wire-verify-account-email',
      mode: z.auth.AuthView.MODE.VERIFY_ACCOUNT,
      section: z.auth.AuthView.SECTION.VERIFY,
    };

    this.switch_ui(switch_params);
  }

  _show_verify_code() {
    const switch_params = {
      focus: 'wire-verify-code-digit-1',
      mode: z.auth.AuthView.MODE.VERIFY_CODE,
      section: z.auth.AuthView.SECTION.VERIFY,
    };

    this.switch_ui(switch_params);
    $('#wire-phone-code-digit-1').focus();
  }

  _show_verify_password() {
    const switch_params = {
      focus: 'wire-verify-password-input',
      mode: z.auth.AuthView.MODE.VERIFY_PASSWORD,
      section: z.auth.AuthView.SECTION.VERIFY,
    };

    this.switch_ui(switch_params);
  }


  //##############################################################################
  // Animations
  //##############################################################################

  switch_ui(switch_params) {
    let animation_params, direction;

    if (this.show_initial_animation) {
      direction = z.auth.AuthView.ANIMATION_DIRECTION.VERTICAL_TOP;
    } else if (this.visible_section() === z.auth.AuthView.SECTION.ACCOUNT) {
      if (switch_params.section !== z.auth.AuthView.SECTION.ACCOUNT) {
        direction = z.auth.AuthView.ANIMATION_DIRECTION.HORIZONTAL_LEFT;
      }
    } else if (this.visible_section() === z.auth.AuthView.SECTION.POSTED) {
      if (switch_params.section === z.auth.AuthView.SECTION.ACCOUNT) {
        direction = z.auth.AuthView.ANIMATION_DIRECTION.HORIZONTAL_RIGHT;
      }
    } else if (this.visible_section() === z.auth.AuthView.SECTION.VERIFY) {
      if (switch_params.section === z.auth.AuthView.SECTION.ACCOUNT) {
        direction = z.auth.AuthView.ANIMATION_DIRECTION.HORIZONTAL_RIGHT;
      } else if (switch_params.section === z.auth.AuthView.SECTION.POSTED) {
        direction = z.auth.AuthView.ANIMATION_DIRECTION.HORIZONTAL_LEFT;
      } else if (this.visible_mode() === z.auth.AuthView.MODE.VERIFY_CODE) {
        if (switch_params.mode === z.auth.AuthView.TYPE.EMAIL) {
          direction = z.auth.AuthView.ANIMATION_DIRECTION.HORIZONTAL_LEFT;
        }
      }
    }

    if (switch_params.section === z.auth.AuthView.SECTION.ACCOUNT) {
      this.account_mode(switch_params.mode);
    } else if (switch_params.section === z.auth.AuthView.SECTION.POSTED) {
      this.posted_mode(switch_params.mode);
    }

    this._clear_animations(z.auth.AuthView.TYPE.SECTION);
    if (switch_params.section !== this.visible_section()) {
      animation_params = {
        direction: direction,
        section: switch_params.section,
        type: z.auth.AuthView.TYPE.SECTION,
      };
      this._shift_ui(animation_params);
    }

    this._clear_animations(z.auth.AuthView.TYPE.FORM);
    if (switch_params.mode !== this.visible_mode()) {
      animation_params = {
        direction: direction,
        section: switch_params.section,
        selector: switch_params.mode,
        type: z.auth.AuthView.TYPE.FORM,
      };
      this._shift_ui(animation_params);
    }

    if (!switch_params.method && !this.visible_method()) {
      this._show_method(z.auth.AuthView.MODE.ACCOUNT_PASSWORD);
      this.visible_method(z.auth.AuthView.MODE.ACCOUNT_PASSWORD);
    } else if (switch_params.method && (this.visible_method() !== switch_params.method)) {
      this._show_method(switch_params.method);
      this.visible_method(switch_params.method);
    }

    if (switch_params.focus) {
      $(`#${switch_params.focus}`).focus_field();
    }
  }

  _show_method(method) {
    this._clear_errors();
    $('.selector-method')
      .find('.button')
      .removeClass('is-active');

    $(`.btn-login-${method}`)
      .addClass('is-active');

    $('.method:visible')
      .hide()
      .css({opacity: 0});

    $(`#login-method-${method}`)
      .show()
      .css({opacity: 1});
  }

  _shift_ui(animation_params) {
    const old_component = $(`.${animation_params.type}:visible`);
    let new_component = $(`#${animation_params.type}-${animation_params.section}`);
    if (animation_params.selector) {
      new_component = $(`#${animation_params.type}-${animation_params.section}-${animation_params.selector}`);
    }
    new_component.show();

    const _change_visible = () => {
      switch (animation_params.type) {
        case z.auth.AuthView.TYPE.FORM:
          return this.visible_mode(animation_params.selector);
        case z.auth.AuthView.TYPE.SECTION:
          return this.visible_section(animation_params.section);
        default:
          break;
      }
    };

    if (!animation_params.direction) {
      old_component.css({
        display: '',
        opacity: '',
      });
      new_component.css({opacity: 1});
      _change_visible();
    } else {
      this.disabled_by_animation(true);

      window.requestAnimationFrame(() => {
        const animation_promises = [];

        if (old_component.length) {
          animation_promises.push(new Promise(function(resolve) {
            $(old_component[0])
              .addClass(`outgoing-${animation_params.direction}`)
              .one(z.util.alias.animationend, function() {
                resolve();
                $(this)
                  .css({
                    display: '',
                    opacity: '',
                  });
              });
          }));
        }

        if (new_component.length) {
          animation_promises.push(new Promise(function(resolve) {
            new_component
              .addClass(`incoming-${animation_params.direction}`)
              .one(z.util.alias.animationend, function() {
                resolve();
                $(this).css({opacity: 1});
              });
          }));
        }

        Promise.all(animation_promises)
          .then(() => {
            _change_visible();
            this.disabled_by_animation(false);
          });
      });
    }
  }

  _clear_animations(type = z.auth.AuthView.TYPE.FORM) {
    $(`.${type}`)
      .off(z.util.alias.animationend)
      .removeClass((index, css) => (css.match(/\boutgoing-\S+/g) || []).join(' '))
      .removeClass((index, css) => (css.match(/\bincoming-\S+/g) || []).join(' '));
  }

  _fade_in_icon_spinner() {
    this.disabled_by_animation(true);
    $('.icon-envelope').fadeOut();
    $('.icon-error').fadeOut();
    $('.icon-spinner').fadeIn();
  }

  _show_icon_envelope() {
    $('.icon-error').hide();
    $('.icon-envelope').show();
  }

  _show_icon_error() {
    $('.icon-envelope').hide();
    $('.icon-error').show();
  }


  //##############################################################################
  // URL changes
  //##############################################################################

  /**
   * Set location hash.
   *
   * @private
   * @param {string} hash - URL hash value
   * @returns {undefined} No return value
   */
  _set_hash(hash = '') {
    window.location.hash = hash;
  }

  /**
   * Get location hash.
   *
   * @private
   * @returns {string} Hash value
   */
  _get_hash() {
    return window.location.hash.substr(1);
  }

  /**
   * No hash value.
   * @private
   * @returns {boolean} No location hash value
   */
  _has_no_hash() {
    return window.location.hash.length === 0;
  }

  /**
   * Navigation on hash change
   * @private
   * @returns {undefined} No return value
   */
  _on_hash_change() {
    this._clear_errors();
    switch (this._get_hash()) {
      case z.auth.AuthView.MODE.ACCOUNT_LOGIN:
        this._show_account_login();
        break;

      case z.auth.AuthView.MODE.ACCOUNT_PASSWORD:
        this._show_account_password();
        break;

      case z.auth.AuthView.MODE.ACCOUNT_PHONE:
        this._show_account_phone();
        break;

      case z.auth.AuthView.MODE.HISTORY:
        this._show_history();
        break;

      case z.auth.AuthView.MODE.LIMIT:
        this._show_limit();
        break;

      case z.auth.AuthView.MODE.MULTIPLE_TABS:
        this._show_tabs();
        break;

      case z.auth.AuthView.MODE.POSTED:
        this._show_posted_resend();
        break;

      case z.auth.AuthView.MODE.POSTED_OFFLINE:
        this._show_posted_offline();
        break;

      case z.auth.AuthView.MODE.POSTED_PENDING:
        this._show_posted_pending();
        break;

      case z.auth.AuthView.MODE.POSTED_RETRY:
        this._show_posted_retry();
        break;

      case z.auth.AuthView.MODE.POSTED_VERIFY:
        this._show_posted_verify();
        break;

      case z.auth.AuthView.MODE.VERIFY_ACCOUNT:
        this._show_verify_account();
        break;

      case z.auth.AuthView.MODE.VERIFY_CODE:
        this._show_verify_code();
        break;

      case z.auth.AuthView.MODE.VERIFY_PASSWORD:
        this._show_verify_password();
        break;

      default:
        this._show_account_register();
    }
  }


  //##############################################################################
  // Validation errors
  //##############################################################################

  /**
   * Add a validation error.
   *
   * @private
   * @param {string} string_identifier - Identifier of error message
   * @param {Array<string>|string} [types] - Input type(s) of validation error
   * @returns {undefined} No return value
   */
  _add_error(string_identifier, types) {
    const error = new z.auth.ValidationError(types || [], string_identifier);
    this.validation_errors.push(error);

    error.types
      .map((type) => {
        switch (type) {
          case z.auth.AuthView.TYPE.CODE:
            this.failed_validation_code(true);
            break;

          case z.auth.AuthView.TYPE.EMAIL:
            this.failed_validation_email(true);
            break;
          case z.auth.AuthView.TYPE.NAME:
            this.failed_validation_name(true);
            break;

          case z.auth.AuthView.TYPE.PASSWORD:
            this.failed_validation_password(true);
            break;

          case z.auth.AuthView.TYPE.PHONE:
            this.failed_validation_phone(true);
            break;

          case z.auth.AuthView.TYPE.TERMS:
            this.failed_validation_terms(true);
            break;

          default:
            break;
        }
      });
  }

  /**
   * Removes all validation errors.
   * @private
   * @returns {undefined} No return value
   */
  _clear_errors() {
    this.failed_validation_code(false);
    this.failed_validation_email(false);
    this.failed_validation_name(false);
    this.failed_validation_password(false);
    this.failed_validation_phone(false);
    this.failed_validation_terms(false);
    this.validation_errors([]);
  }

  /**
   * Get the validation error by inout type.
   *
   * @private
   * @param {z.auth.AuthView.TYPE} type - Input type to get error for
   * @returns {z.auth.ValidationError} Validation Error
   */
  _get_error_by_type(type) {
    return ko.utils.arrayFirst(this.validation_errors(), ({types: error_types}) => error_types.includes(type));
  }

  /**
   * Check whether a form has errors and play the alert sound.
   * @private
   * @returns {boolean} Form has an error
   */
  _has_errors() {
    let has_error = false;
    if (this.validation_errors().length > 0) {
      amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT);
      has_error = true;
    }
    return has_error;
  }

  /**
   * Remove a validation error.
   *
   * @private
   * @param {string} type - Input type of validation error
   * @returns {undefined} No return value
   */
  _remove_error(type) {
    this.validation_errors.remove(this._get_error_by_type(type));

    switch (type) {
      case z.auth.AuthView.TYPE.CODE:
        this.failed_validation_code(false);
        break;

      case z.auth.AuthView.TYPE.EMAIL:
        this.failed_validation_email(false);
        break;

      case z.auth.AuthView.TYPE.NAME:
        this.failed_validation_name(false);
        break;

      case z.auth.AuthView.TYPE.PASSWORD:
        this.failed_validation_password(false);
        break;

      case z.auth.AuthView.TYPE.PHONE:
        this.failed_validation_phone(false);
        break;

      case z.auth.AuthView.TYPE.TERMS:
        this.failed_validation_terms(false);
        break;

      default:
        break;
    }
  }

  /**
   * Validate code input.
   * @private
   * @returns {boolean} Phone code is long enough
   */
  _validate_code() {
    return this.code().length >= 6;
  }

  /**
   * Validate email input.
   * @private
   * @returns {undefined} No return value
   */
  _validate_email() {
    const username = this.username()
      .trim()
      .toLowerCase();

    if (!username.length) {
      return this._add_error(z.string.auth_error_email_missing, z.auth.AuthView.TYPE.EMAIL);
    }

    if (!z.util.is_valid_email(username)) {
      this._add_error(z.string.auth_error_email_malformed, z.auth.AuthView.TYPE.EMAIL);
    }
  }

  /**
   * Validate the user input.
   *
   * @private
   * @param {z.auth.AuthView.MODE} mode - View state of the authentication page
   * @returns {boolean} User input has validation errors
   */
  _validate_input(mode) {
    this._clear_errors();

    if (mode === z.auth.AuthView.MODE.ACCOUNT_REGISTER) {
      this._validate_name();
    }

    const email_modes = [
      z.auth.AuthView.MODE.ACCOUNT_REGISTER,
      z.auth.AuthView.MODE.VERIFY_ACCOUNT,
    ];
    if (email_modes.includes(mode)) {
      this._validate_email();
    }

    const password_modes = [
      z.auth.AuthView.MODE.ACCOUNT_PASSWORD,
      z.auth.AuthView.MODE.ACCOUNT_REGISTER,
      z.auth.AuthView.MODE.VERIFY_ACCOUNT,
      z.auth.AuthView.MODE.VERIFY_PASSWORD,
    ];
    if (password_modes.includes(mode)) {
      this._validate_password(mode);
    }

    if (mode === z.auth.AuthView.MODE.ACCOUNT_PASSWORD) {
      this._validate_username();
    }

    const phone_modes = [
      z.auth.AuthView.MODE.ACCOUNT_PHONE,
      z.auth.AuthView.MODE.VERIFY_PASSWORD,
    ];
    if (phone_modes.includes(mode)) {
      this._validate_phone();
    }

    return !this._has_errors();
  }

  /**
   * Validate name input.
   * @private
   * @returns {undefined} No return value
   */
  _validate_name() {
    if (this.name().length < z.user.UserRepository.CONFIG.MINIMUM_NAME_LENGTH) {
      return this._add_error(z.string.auth_error_name_short, z.auth.AuthView.TYPE.NAME);
    }
  }

  /**
   * Validate password input.
   *
   * @private
   * @param {z.auth.AuthView.MODE} mode - View state of the authentication page
   * @returns {undefined} No return value
   */
  _validate_password(mode) {
    if (this.password().length < z.config.MINIMUM_PASSWORD_LENGTH) {
      if (mode === z.auth.AuthView.MODE.ACCOUNT_PASSWORD) {
        return this._add_error(z.string.auth_error_password_wrong, z.auth.AuthView.TYPE.PASSWORD);
      }
      this._add_error(z.string.auth_error_password_short, z.auth.AuthView.TYPE.PASSWORD);
    }
  }

  /**
   * Validate phone input.
   * @private
   * @returns {undefined} No return value
   */
  _validate_phone() {
    if (!z.util.is_valid_phone_number(this.phone_number_e164())) {
      this._add_error(z.string.auth_error_phone_number_invalid, z.auth.AuthView.TYPE.PHONE);
    }
  }

  /**
   * Validate username input.
   * @private
   * @returns {undefined} No return value
   */
  _validate_username() {
    const username = this.username()
      .trim()
      .toLowerCase();

    if (!username.length) {
      return this._add_error(z.string.auth_error_email_missing, z.auth.AuthView.TYPE.EMAIL);
    }

    const phone = z.util.phone_number_to_e164(username, this.country() || navigator.language);
    if (!z.util.is_valid_email(username) && !z.util.is_valid_username(username) && !z.util.is_valid_phone_number(phone)) {
      this._add_error(z.string.auth_error_email_malformed, z.auth.AuthView.TYPE.EMAIL);
    }
  }


  //##############################################################################
  // Misc
  //##############################################################################

  /**
   * Logout the user again.
   * @todo What do we actually need to delete here
   * @returns {undefined} No return value
   */
  logout() {
    this.auth.repository.logout()
      .then(() => {
        this.auth.repository.delete_access_token();
        window.location.replace('/auth');
      });
  }

  /**
   * User account has been verified.
   * @private
   * @param {boolean} [registration=true] - Verification from registration
   * @returns {undefined} No return value
   */
  _account_verified(registration = true) {
    this.logger.info('User account verified. User can now login.');
    if (registration) {
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.REGISTRATION.SUCCEEDED, {content: this.registration_context});
    }
    this._authentication_successful();
  }

  /**
   * Append parameter to URL if exists.
   * @param {string} url - Previous URL string
   * @returns {string} Updated URL
   */
  _append_existing_parameters(url) {
    AuthViewModel.CONFIG.FORWARDED_URL_PARAMETERS
      .forEach(function(parameter_name) {
        url = z.util.forward_url_parameter(url, parameter_name);
      });

    return url;
  }

  /**
   * User successfully authenticated on the backend side.
   *
   * @note Gets the client and forwards the user to the login.
   * @private
   * @returns {undefined} No return value
   */
  _authentication_successful() {
    this.logger.info('Logging in');

    this._get_self_user()
      .then(() => {
        return this.client_repository.get_valid_local_client();
      })
      .catch((error) => {
        if (error.type === z.user.UserError.TYPE.USER_MISSING_EMAIL) {
          throw error;
        }

        this.logger.info(`No valid local client found: ${error.message}`, error);
        if (error.type === z.client.ClientError.TYPE.MISSING_ON_BACKEND) {
          this.logger.info('Local client rejected as invalid by backend. Reinitializing storage.');
          return this.storage_service.init(this.self_user().id);
        }
      })
      .then(() => {
        return this.cryptography_repository.init(this.storage_service.db);
      })
      .then(() => {
        if (this.client_repository.current_client()) {
          this.logger.info('Active client found. Redirecting to app...');
          return this._redirect_to_app();
        }

        this.logger.info('No active client found. We need to register one...');
        this._register_client();
      })
      .catch((error) => {
        if (error.type !== z.user.UserError.TYPE.USER_MISSING_EMAIL) {
          this.logger.error(`Login failed: ${error.message}`, error);
          this._add_error(z.string.auth_error_misc);
          this._has_errors();
          this._set_hash(z.auth.AuthView.MODE.ACCOUNT_LOGIN);
        }
      });
  }

  /**
   * Get and store the self user.
   * @private
   * @returns {Promise} Resolves wit the Self user
   */
  _get_self_user() {
    return this.user_repository.get_me()
      .then((user_et) => {
        this.self_user(user_et);
        this.logger.info(`Retrieved self user: ${this.self_user().id}`);
        this.pending_server_request(false);

        if (this.self_user().email()) {
          return this.storage_service.init(this.self_user().id)
            .then(() => {
              this.client_repository.init(this.self_user());
              return this.self_user();
            });
        }

        this._set_hash(z.auth.AuthView.MODE.VERIFY_ACCOUNT);
        throw new z.user.UserError(z.user.UserError.TYPE.USER_MISSING_EMAIL);
      });
  }

  /**
   * Check whether the device has a local history.
   * @private
   * @returns {boolean} At least one conversation event stored
   */
  _has_local_history() {
    return this.storage_service.get_all(z.storage.StorageService.OBJECT_STORE.EVENTS)
      .then((events) => events.length > 0);
  }

  /**
   * Redirects to the app after successful login
   * @private
   * @returns {undefined} No return value
   */
  _redirect_to_app() {
    let url = '/';
    url = this._append_existing_parameters(url);
    window.location.replace(url);
  }

  _register_client() {
    return this.client_repository.register_client(this.password())
      .then((client_observable) => {
        this.event_repository.current_client = client_observable;
        return this.event_repository.initialize_last_notification_id(client_observable().id);
      })
      .catch((error) => {
        if (error.code === z.service.BackendClientError.STATUS_CODE.NOT_FOUND) {
          return this.logger.warn(`Cannot set starting point on notification stream: ${error.message}`, error);
        }
        throw error;
      })
      .then(() => {
        return this.client_repository.get_clients_for_self();
      })
      .then((client_ets) => {
        const number_of_clients = client_ets ? client_ets.length : 0;
        this.logger.info(`User has '${number_of_clients}' registered clients`, client_ets);

        // Show history screen if there are already registered clients
        if (number_of_clients) {
          return this._has_local_history()
            .then((has_history) => {
              this.device_reused(has_history);
              this._set_hash(z.auth.AuthView.MODE.HISTORY);
            });
        }

        // Make sure client entities always see the history screen
        if (this.client_repository.current_client().is_temporary()) {
          return this._set_hash(z.auth.AuthView.MODE.HISTORY);
        }

        // Don't show history screen if the webapp is the first client that has been registered
        this._redirect_to_app();
      })
      .catch((error) => {
        if (error.type === z.client.ClientError.TYPE.TOO_MANY_CLIENTS) {
          this.logger.warn('User has already registered the maximum number of clients', error);
          return window.location.hash = z.auth.AuthView.MODE.LIMIT;
        }
        this.logger.error(`Failed to register a new client: ${error.message}`, error);
      });
  }

  /**
   * Track app launch for Localytics
   * @private
   * @returns {undefined} No return value
   */
  _track_app_launch() {
    let mechanism = 'direct';
    if (document.referrer.startsWith('https://wire.com/verify/')) {
      mechanism = 'email_verify';
    } else if (document.referrer.startsWith('https://wire.com/forgot/')) {
      mechanism = 'password_reset';
    }
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.APP_LAUNCH, {mechanism});
  }
};

$(function() {
  if ($('.auth-page').length) {
    wire.auth.view = new z.ViewModel.AuthViewModel('auth-page', wire.auth);
  }
});

// jQuery helpers
$.fn.extend({
  focus_field() {
    this.each(function() {
      // Timeout needed (for Chrome): http://stackoverflow.com/a/17384592/451634
      window.setTimeout(() => {
        $(this).focus();
      }, 0);
    });
  },
});
