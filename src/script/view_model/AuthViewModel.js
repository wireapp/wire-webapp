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

import Logger from 'utils/Logger';

import Cookies from 'js-cookie';
import moment from 'moment';
import {ValidationUtil} from '@wireapp/commons';

import App from '../main/app';
import {URL_PATH, getAccountPagesUrl, getWebsiteUrl} from '../externalRoute';
import AssetService from '../assets/AssetService';
import StorageService from '../storage/StorageService';
import UserRepository from '../user/UserRepository';
import {t} from 'utils/LocalizerUtil';
import TimeUtil from 'utils/TimeUtil';
/* eslint-disable no-unused-vars */
import PhoneFormatGlobal from 'phoneformat.js';
import view from '../auth/AuthView';
import validationError from '../auth/ValidationError';
/* eslint-enable no-unused-vars */
import {resolve as resolveDependency, graph} from '../config/appResolver';

class AuthViewModel {
  static get CONFIG() {
    return {
      FORWARDED_URL_PARAMETERS: [
        z.auth.URLParameter.ENVIRONMENT,
        z.auth.URLParameter.LOCALE,
        z.auth.URLParameter.TRACKING,
      ],
      RESET_TIMEOUT: TimeUtil.UNITS_IN_MILLIS.SECOND * 2,
    };
  }

  /**
   * View model for the auth page.
   * @param {BackendClient} backendClient - Configured backend client
   */
  constructor(backendClient) {
    this.click_on_remove_device_submit = this.click_on_remove_device_submit.bind(this);

    this.logger = Logger('z.viewModel.AuthViewModel');

    this.authRepository = resolveDependency(graph.AuthRepository);
    this.audio_repository = resolveDependency(graph.AudioRepository);

    // Cryptography
    this.asset_service = new AssetService(backendClient);
    // @todo Don't operate with the service directly. Get a repository!
    this.storageService = new StorageService();
    this.storage_repository = new z.storage.StorageRepository(this.storageService);

    this.cryptography_service = new z.cryptography.CryptographyRepository(backendClient);
    this.cryptography_repository = new z.cryptography.CryptographyRepository(
      this.cryptography_service,
      this.storage_repository
    );
    this.client_service = new z.client.ClientService(backendClient, this.storageService);
    this.client_repository = new z.client.ClientRepository(this.client_service, this.cryptography_repository);

    this.selfService = resolveDependency(graph.SelfService);
    this.user_repository = new UserRepository(
      resolveDependency(graph.UserService),
      this.asset_service,
      this.selfService,
      this.client_repository,
      resolveDependency(graph.ServerTimeRepository)
    );

    this.singleInstanceHandler = new z.main.SingleInstanceHandler();

    const eventService = new z.event.EventService(this.storageService);
    this.notification_service = new z.event.NotificationService(backendClient, this.storageService);
    this.web_socket_service = new z.event.WebSocketService(backendClient);
    this.event_repository = new z.event.EventRepository(
      eventService,
      this.notification_service,
      this.web_socket_service,
      undefined,
      this.cryptography_repository,
      this.user_repository
    );

    this.pending_server_request = ko.observable(false);
    this.disabled_by_animation = ko.observable(false);

    this.deviceReused = ko.observable(false);

    this.country_code = ko.observable('');
    this.country = ko.observable('');
    this.password = ko.observable('');
    this.persist = ko.observable(true);
    this.phone_number = ko.observable('');
    this.username = ko.observable('');

    this.is_public_computer = ko.observable(false);
    this.is_public_computer.subscribe(is_public_computer => this.persist(!is_public_computer));

    this.client_type = ko.pureComputed(() => {
      return this.persist() ? z.client.ClientType.PERMANENT : z.client.ClientType.TEMPORARY;
    });

    this.self_user = ko.observable();

    // Manage devices
    this.remove_form_error = ko.observable(false);
    this.device_modal = undefined;
    this.permanent_devices = ko.pureComputed(() => {
      return this.client_repository.clients().filter(client_et => client_et.type === z.client.ClientType.PERMANENT);
    });

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
        .map(digit => digit())
        .join('')
        .substr(0, 6);
    });
    this.code.subscribe(code => {
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
    this.code_expiration_timestamp.subscribe(timestamp => {
      this.code_expiration_in(moment.unix(timestamp).fromNow());
      this.code_interval_id = window.setInterval(() => {
        if (timestamp <= TimeUtil.getUnixTimestamp()) {
          window.clearInterval(this.code_interval_id);
          return this.code_expiration_timestamp(0);
        }
        this.code_expiration_in(moment.unix(timestamp).fromNow());
      }, 20000);
    });

    this.validation_errors = ko.observableArray([]);
    this.failed_validation_email = ko.observable(false);
    this.failed_validation_password = ko.observable(false);
    this.failed_validation_code = ko.observable(false);
    this.failed_validation_phone = ko.observable(false);

    this.can_login_phone = ko.pureComputed(() => {
      return !this.disabled_by_animation() && this.country_code().length > 1 && this.phone_number().length;
    });
    this.can_resend_code = ko.pureComputed(() => {
      return !this.disabled_by_animation() && this.code_expiration_timestamp() < TimeUtil.getUnixTimestamp();
    });
    this.can_resend_verification = ko.pureComputed(() => !this.disabled_by_animation() && this.username().length);
    this.can_verify_account = ko.pureComputed(() => !this.disabled_by_animation());
    this.can_verify_password = ko.pureComputed(() => !this.disabled_by_animation() && this.password().length);

    this.posted_text = ko.pureComputed(() => t('authPostedResend', this.username()));
    this.verify_code_text = ko.pureComputed(() => {
      const phone_number =
        PhoneFormat.formatNumberForMobileDialing('', this.phone_number_e164()) || this.phone_number_e164();
      return t('authVerifyCodeDescription', phone_number);
    });

    this.verify_code_timer_text = ko.pureComputed(() => t('authVerifyCodeResendTimer', this.code_expiration_in()));

    this.visible_section = ko.observable(undefined);
    this.visible_mode = ko.observable(undefined);
    this.visible_method = ko.observable(undefined);

    this.account_mode = ko.observable(undefined);

    this.blocked_mode = ko.observable(undefined);
    this.blocked_mode_cookies = ko.pureComputed(() => this.blocked_mode() === z.auth.AuthView.MODE.BLOCKED_COOKIES);
    this.blocked_mode_database = ko.pureComputed(() => this.blocked_mode() === z.auth.AuthView.MODE.BLOCKED_DATABASE);
    this.blocked_mode_tabs = ko.pureComputed(() => this.blocked_mode() === z.auth.AuthView.MODE.BLOCKED_TABS);

    this.posted_mode = ko.observable(undefined);
    this.posted_mode_verify = ko.pureComputed(() => this.posted_mode() === z.auth.AuthView.MODE.POSTED_VERIFY);

    // dirty fix: The AssetRemoteData class consumes the global `wire.app` object.
    // so we need to publish a fake `wire.app` object only with what the class consumes (namely the assetService)
    // more engineering will be required to get rid of that global dependency
    window.wire.app = {
      service: {
        asset: new AssetService(backendClient),
      },
    };

    const elementSelector = '.auth-page';
    ko.applyBindings(this, document.querySelector(elementSelector));

    this.tabsCheckIntervalId = undefined;
    this.previousHash = undefined;

    this._init_base();
    $(elementSelector).show();
    $('.auth-page-container').css({display: 'flex'});
  }

  _init_base() {
    $(window)
      .on('dragover drop', () => false)
      .on('hashchange', this._on_hash_change.bind(this))
      .on('keydown', this.keydown_auth.bind(this));

    this._init_page();

    // Select country based on location of user IP
    this.country_code((z.util.CountryCodes.getCountryCode($('[name=geoip]').attr('country')) || 1).toString());
    this.changed_country_code();

    this.audio_repository.init();
  }

  _init_page() {
    Promise.resolve(this._get_hash())
      .then(current_hash => this._check_cookies(current_hash))
      .then(current_hash => this._check_database(current_hash))
      .then(() => this._checkSingleInstance())
      .then(() => {
        this._init_url_parameter();
        this._init_url_hash();
      })
      .catch(error => {
        if (!(error instanceof z.error.AuthError)) {
          throw error;
        }
      });
  }

  _init_url_hash() {
    const modes_to_block = [
      z.auth.AuthView.MODE.HISTORY,
      z.auth.AuthView.MODE.LIMIT,
      z.auth.AuthView.MODE.BLOCKED_TABS,
      z.auth.AuthView.MODE.POSTED_VERIFY,
      z.auth.AuthView.MODE.VERIFY_ACCOUNT,
      z.auth.AuthView.MODE.VERIFY_CODE,
      z.auth.AuthView.MODE.VERIFY_PASSWORD,
    ];

    if (this._has_no_hash() || modes_to_block.includes(this._get_hash())) {
      return this._set_hash(z.auth.AuthView.MODE.ACCOUNT_LOGIN);
    }

    return this._on_hash_change();
  }

  _init_url_parameter() {
    const mode = z.util.URLUtil.getParameter(z.auth.URLParameter.MODE);
    if (mode) {
      const isExpectedMode = mode === z.auth.AuthView.MODE.ACCOUNT_LOGIN;
      if (isExpectedMode) {
        return this._set_hash(mode);
      }
    }
  }

  //##############################################################################
  // Cookies support, private mode and & multiple tabs check
  //##############################################################################

  /**
   * Check cookies are enabled.
   * @param {string} current_hash - Current page hash
   * @returns {Promise} Resolves when cookies are enabled
   */
  _check_cookies(current_hash) {
    const cookie_name = App.CONFIG.COOKIES_CHECK.COOKIE_NAME;

    const cookies_enabled = () => {
      if (current_hash === z.auth.AuthView.MODE.BLOCKED_COOKIES) {
        this._set_hash();
      }
      return Promise.resolve(current_hash);
    };

    const cookies_disabled = () => {
      if (current_hash !== z.auth.AuthView.MODE.BLOCKED_COOKIES) {
        this._set_hash(z.auth.AuthView.MODE.BLOCKED_COOKIES);
        throw new z.error.AuthError(z.error.AuthError.TYPE.COOKIES_DISABLED);
      }
    };

    switch (navigator.cookieEnabled) {
      case true:
        return cookies_enabled();
      case false:
        return cookies_disabled();
      default:
        Cookies.set(cookie_name, 'yes');
        if (Cookies.get(cookie_name)) {
          Cookies.remove(cookie_name);
          return cookies_enabled();
        }
        return cookies_disabled();
    }
  }

  /**
   * Check that we are not in unsupported private mode browser.
   * @param {string} current_hash - Current page hash
   * @returns {Promise} Resolves when the database check has passed
   */
  _check_database(current_hash) {
    return z.util
      .checkIndexedDb()
      .then(() => {
        if (current_hash === z.auth.AuthView.MODE.BLOCKED_DATABASE) {
          this._set_hash();
        }
      })
      .catch(error => {
        if (current_hash !== z.auth.AuthView.MODE.BLOCKED_DATABASE) {
          this._set_hash(z.auth.AuthView.MODE.BLOCKED_DATABASE);
          throw error;
        }
      });
  }

  /**
   * Check that this is the single instance tab of the app.
   * @returns {Promise} Resolves when page is the first tab
   */
  _checkSingleInstance() {
    if (!z.util.Environment.electron) {
      if (!this.tabsCheckIntervalId) {
        this._setTabsCheckInterval();
      }

      const otherInstanceRunning = this.singleInstanceHandler.hasOtherRunningInstance();
      if (otherInstanceRunning) {
        const currentHash = this._get_hash();

        if (!this.previousHash) {
          this.previousHash = currentHash;

          const isBlockedTabsHash = currentHash === z.auth.AuthView.MODE.BLOCKED_TABS;
          if (isBlockedTabsHash) {
            this._on_hash_change();
          } else {
            this._set_hash(z.auth.AuthView.MODE.BLOCKED_TABS);
          }
        }

        return Promise.reject(new z.error.AuthError(z.error.AuthError.TYPE.MULTIPLE_TABS));
      }
    }

    return Promise.resolve();
  }

  _clearTabsCheckInterval() {
    if (this.tabsCheckIntervalId) {
      window.clearInterval(this.tabsCheckIntervalId);
      this.tabsCheckIntervalId = undefined;
    }
  }

  _setTabsCheckInterval() {
    this.tabsCheckIntervalId = window.setInterval(() => {
      this._checkSingleInstance()
        .then(() => {
          const currentHash = this._get_hash();
          const isBlockedTabsHash = currentHash === z.auth.AuthView.MODE.BLOCKED_TABS;
          if (isBlockedTabsHash) {
            this._init_url_parameter();

            if (this.previousHash) {
              const wasBlockedTabsHash = this.previousHash === z.auth.AuthView.MODE.BLOCKED_TABS;
              const nextHash = wasBlockedTabsHash ? z.auth.AuthView.MODE.ACCOUNT_LOGIN : this.previousHash;
              this.previousHash = undefined;
              this._set_hash(nextHash);
            }
          }
        })
        .catch(error => {
          const isMultipleTabs = error.type === z.error.AuthError.TYPE.MULTIPLE_TABS;
          if (!isMultipleTabs) {
            throw error;
          }
        });
    }, 500);
    $(window).on('unload', () => this._clearTabsCheckInterval());
  }

  //##############################################################################
  // Form actions
  //##############################################################################

  /**
   * Sign in using a phone number.
   * @returns {undefined} No return value
   */
  login_phone() {
    const isValidPhoneLogin = this.can_login_phone() && this._validate_input(z.auth.AuthView.MODE.ACCOUNT_LOGIN);
    if (!this.pending_server_request() && isValidPhoneLogin) {
      const _on_code_request_success = response => {
        window.clearInterval(this.code_interval_id);
        if (response.expires_in) {
          this.code_expiration_timestamp(TimeUtil.getUnixTimestamp() + response.expires_in);
        } else if (!response.label) {
          this.code_expiration_timestamp(TimeUtil.getUnixTimestamp() + z.config.LOGIN_CODE_EXPIRATION);
        }
        this._set_hash(z.auth.AuthView.MODE.VERIFY_CODE);
        this.pending_server_request(false);
      };

      this.pending_server_request(true);
      const payload = this._create_payload(z.auth.AuthView.MODE.ACCOUNT_LOGIN);

      this.authRepository
        .requestLoginCode(payload)
        .then(response => _on_code_request_success(response))
        .catch(error => {
          this.pending_server_request(false);
          if (navigator.onLine) {
            switch (error.label) {
              case z.error.BackendClientError.LABEL.BAD_REQUEST:
                this._add_error(t('authErrorPhoneNumberInvalid'), z.auth.AuthView.TYPE.PHONE);
                break;
              case z.error.BackendClientError.LABEL.INVALID_PHONE:
                this._add_error(t('authErrorPhoneNumberUnknown'), z.auth.AuthView.TYPE.PHONE);
                break;
              case z.error.BackendClientError.LABEL.PASSWORD_EXISTS:
                this._set_hash(z.auth.AuthView.MODE.VERIFY_PASSWORD);
                break;
              case z.error.BackendClientError.LABEL.PENDING_LOGIN:
                _on_code_request_success(error);
                break;
              case z.error.BackendClientError.LABEL.PHONE_BUDGET_EXHAUSTED:
                this._add_error(t('authErrorPhoneNumberBudget'), z.auth.AuthView.TYPE.PHONE);
                break;
              case z.error.BackendClientError.LABEL.SUSPENDED:
                this._add_error(t('authErrorSuspended'));
                break;
              case z.error.BackendClientError.LABEL.UNAUTHORIZED:
                this._add_error(t('authErrorPhoneNumberForbidden'), z.auth.AuthView.TYPE.PHONE);
                break;
              default:
                this._add_error(t('authErrorMisc'));
            }
          } else {
            this._add_error(t('authErrorOffline'));
          }
          this._has_errors();
        });
    }
  }

  /**
   * Add an email on phone number login.
   * @returns {undefined} No return value
   */
  verify_account() {
    const canVerifyAccount = this.can_verify_account() && this._validate_input(z.auth.AuthView.MODE.VERIFY_ACCOUNT);
    if (!this.pending_server_request() && canVerifyAccount) {
      this.pending_server_request(true);

      this.selfService
        .putSelfPassword(this.password())
        .catch(error => {
          this.logger.warn(`Could not change user password: ${error.message}`, error);
          if (error.code !== z.error.BackendClientError.STATUS_CODE.FORBIDDEN) {
            throw error;
          }
        })
        .then(() => this.selfService.putSelfEmail(this.username()))
        .then(() => {
          this.pending_server_request(false);
          this._wait_for_update();
          this._set_hash(z.auth.AuthView.MODE.POSTED_VERIFY);
        })
        .catch(error => {
          this.logger.warn(`Could not verify account: ${error.message}`, error);

          this.pending_server_request(false);
          if (error) {
            switch (error.label) {
              case z.error.BackendClientError.LABEL.BLACKLISTED_EMAIL:
                this._add_error(t('authErrorEmailForbidden'), z.auth.AuthView.TYPE.EMAIL);
                break;
              case z.error.BackendClientError.LABEL.KEY_EXISTS:
                this._add_error(t('authErrorEmailExists'), z.auth.AuthView.TYPE.EMAIL);
                break;
              case z.error.BackendClientError.LABEL.INVALID_EMAIL:
                this._add_error(t('authErrorEmailMalformed'), z.auth.AuthView.TYPE.EMAIL);
                break;
              default:
                this._add_error(t('authErrorEmailMalformed'), z.auth.AuthView.TYPE.EMAIL);
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

      this.authRepository
        .login(payload, this.persist())
        .then(() => this._authentication_successful())
        .catch(() => {
          if (!this.validation_errors().length) {
            this._add_error(t('authErrorCode'), z.auth.AuthView.TYPE.CODE);
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

      this.authRepository
        .login(payload, this.persist())
        .then(() => this._authentication_successful())
        .catch(error => {
          this.pending_server_request(false);
          $('#wire-verify-password').focus();
          if (navigator.onLine) {
            if (error.label) {
              if (error.label === z.error.BackendClientError.LABEL.PENDING_ACTIVATION) {
                this._add_error(t('authErrorPending'));
              } else {
                this._add_error(t('authErrorSignIn'), z.auth.AuthView.TYPE.PASSWORD);
              }
            } else {
              this._add_error(t('authErrorMisc'));
            }
          } else {
            this._add_error(t('authErrorOffline'));
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
    switch (mode) {
      case z.auth.AuthView.MODE.ACCOUNT_LOGIN: {
        return {
          force: false,
          phone: this.phone_number_e164(),
        };
      }

      case z.auth.AuthView.MODE.VERIFY_CODE: {
        return {
          code: this.code(),
          label: this.client_repository.constructCookieLabel(this.phone_number_e164(), this.client_type()),
          label_key: this.client_repository.constructCookieLabelKey(this.phone_number_e164(), this.client_type()),
          phone: this.phone_number_e164(),
        };
      }

      case z.auth.AuthView.MODE.VERIFY_PASSWORD: {
        return {
          label: this.client_repository.constructCookieLabel(this.phone_number_e164(), this.client_type()),
          label_key: this.client_repository.constructCookieLabelKey(this.phone_number_e164(), this.client_type()),
          password: this.password(),
          phone: this.phone_number_e164(),
        };
      }

      default:
        this.logger.warn(`Unsupported payload of type '${mode}' requested`);
    }
  }

  //##############################################################################
  // Events
  //##############################################################################

  changed_country(view_model, event) {
    this.clear_error(z.auth.AuthView.TYPE.PHONE);

    const country = event ? event.currentTarget.value || undefined : this.country();
    this.country_code(`+${z.util.CountryCodes.getCountryCode(country)}`);
    $('#wire-login-phone').focus();
  }

  changed_country_code(view_model, event) {
    let country_iso;
    const country_code_value = event ? event.currentTarget.value : this.country_code();
    const country_code_matches = country_code_value.match(/\d+/g) || [];
    const country_code = country_code_matches.join('').substr(0, 4);

    if (country_code) {
      this.country_code(`+${country_code}`);
      country_iso = z.util.CountryCodes.getCountryByCode(country_code) || 'X1';
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
      this._add_error(t('authErrorPhoneNumberInvalid'), z.auth.AuthView.TYPE.PHONE);
    }
  }

  clear_error(mode, input_event) {
    const error_mode = input_event ? input_event.currentTarget.classList[1] : mode;
    this._remove_error(error_mode);
  }

  clear_error_password(view_model, input_event) {
    this.failed_validation_password(false);
    if (this._validatePassword(input_event.currentTarget.value)) {
      this._remove_error(input_event.currentTarget.classList[1]);
    }
  }

  clicked_on_change_phone() {
    this._set_hash(z.auth.AuthView.MODE.ACCOUNT_LOGIN);
  }

  clickOnHandover() {
    this.singleInstanceHandler.deregisterInstance(true);
    this._checkSingleInstance();
  }

  clicked_on_password() {
    const url = getAccountPagesUrl(URL_PATH.PASSWORD_RESET);
    z.util.SanitizationUtil.safeWindowOpen(url);
  }

  clicked_on_resend_code() {
    if (this.can_resend_code()) {
      this.login_phone();
    }
  }

  clicked_on_resend_registration() {
    // handle pending verification case
  }

  clicked_on_resend_verification() {
    if (this.can_resend_verification) {
      this._fade_in_icon_spinner();

      if (!this.pending_server_request()) {
        this.pending_server_request(true);

        this.selfService
          .putSelfEmail(this.username())
          .then(response => this._on_resend_success(response))
          .catch(() => {
            this.pending_server_request(false);
            $('.icon-spinner').fadeOut();
            window.setTimeout(() => {
              $('.icon-error').fadeIn();
              this.disabled_by_animation(false);
            }, z.motion.MotionDuration.LONG);
          });
      }
    }
  }

  clicked_on_wire_link() {
    const path = t('urlWebsiteRoot');
    z.util.SanitizationUtil.safeWindowOpen(getWebsiteUrl(path));
  }

  keydown_auth(keyboard_event) {
    if (z.util.KeyboardUtil.isEnterKey(keyboard_event)) {
      switch (this.visible_mode()) {
        case z.auth.AuthView.MODE.ACCOUNT_LOGIN:
          this.login_phone();
          break;

        case z.auth.AuthView.MODE.VERIFY_ACCOUNT:
          this.verify_account();
          break;

        case z.auth.AuthView.MODE.VERIFY_PASSWORD:
          this.verify_password();
          break;

        case z.auth.AuthView.MODE.LIMIT:
          if (!this.device_modal || this.device_modal.isHidden()) {
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

  keydown_phone_code(view_model, keyboard_event) {
    if (z.util.KeyboardUtil.isPasteAction(keyboard_event)) {
      return true;
    }

    if (z.util.KeyboardUtil.isFunctionKey(keyboard_event)) {
      return false;
    }

    const target_id = keyboard_event.currentTarget.id;
    const target_digit = window.parseInt(target_id.substr(target_id.length - 1));

    let focus_digit;
    switch (keyboard_event.key) {
      case z.util.KeyboardUtil.KEY.ARROW_LEFT:
      case z.util.KeyboardUtil.KEY.ARROW_UP:
        focus_digit = target_digit - 1;
        $(`#wire-verify-code-digit-${Math.max(1, focus_digit)}`).focus();
        break;

      case z.util.KeyboardUtil.KEY.ARROW_DOWN:
      case z.util.KeyboardUtil.KEY.ARROW_RIGHT:
        focus_digit = target_digit + 1;
        $(`#wire-verify-code-digit-${Math.min(6, focus_digit)}`).focus();
        break;

      case z.util.KeyboardUtil.KEY.BACKSPACE:
      case z.util.KeyboardUtil.KEY.DELETE:
        if (keyboard_event.currentTarget.value === '') {
          focus_digit = target_digit - 1;
          $(`#wire-verify-code-digit-${Math.max(1, focus_digit)}`).focus();
        }
        return true;

      default: {
        const char =
          String.fromCharCode(keyboard_event.keyCode).match(/\d+/g) ||
          String.fromCharCode(keyboard_event.keyCode - 48).match(/\d+/g);

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
      const hideCallback = $(document).off('keydown.deviceModal');
      this.device_modal = new z.ui.Modal('#modal-limit', hideCallback);
      this.device_modal.setAutoclose(false);
    }

    if (this.device_modal.isHidden()) {
      this.client_repository.getClientsForSelf();
      $(document).on('keydown.deviceModal', keyboard_event => {
        if (z.util.KeyboardUtil.isEscapeKey(keyboard_event)) {
          this.device_modal.hide();
        }
      });
    }

    this.device_modal.show();
  }

  close_model_manage_devices() {
    this.device_modal.hide();
  }

  clicked_on_navigate_back() {
    const locationPath = this._append_existing_parameters('/auth/#login');
    window.location.replace(locationPath);
  }

  click_on_remove_device_submit(password, device) {
    this.client_repository
      .deleteClient(device.id, password)
      .then(() => this._register_client())
      .then(() => this.device_modal.toggle())
      .catch(error => {
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

  _on_resend_success() {
    this.pending_server_request(false);
    $('.icon-spinner').fadeOut();

    window.setTimeout(() => {
      $('.icon-check').fadeIn();
    }, z.motion.MotionDuration.LONG);

    window.setTimeout(() => {
      $('.icon-check').fadeOut();
      $('.icon-envelope').fadeIn();
      this.disabled_by_animation(false);
    }, AuthViewModel.CONFIG.RESET_TIMEOUT);
  }

  _wait_for_update() {
    this.logger.info('Opened WebSocket connection to wait for user update');

    this.web_socket_service.connect(notification => {
      const [event] = notification.payload;
      const {type: event_type, user} = event;
      const is_user_update = event_type === z.event.Backend.USER.UPDATE;

      this.logger.info(`»» Event: '${event_type}'`, {event_json: JSON.stringify(event), event_object: event});
      if (is_user_update && user.email) {
        this.logger.info('User account verified. User can now login.');
        this._authentication_successful();
      }
    });
  }

  //##############################################################################
  // Views and Navigation
  //##############################################################################

  _show_account_login() {
    const switch_params = {
      focus: 'wire-login-phone',
      mode: z.auth.AuthView.MODE.ACCOUNT_LOGIN,
      section: z.auth.AuthView.SECTION.ACCOUNT,
    };

    this.switch_ui(switch_params);
  }

  _show_blocked_cookies() {
    const switch_params = {
      mode: z.auth.AuthView.MODE.BLOCKED_COOKIES,
      section: z.auth.AuthView.SECTION.BLOCKED,
    };

    this.switch_ui(switch_params);
  }

  _show_blocked_database() {
    const switch_params = {
      mode: z.auth.AuthView.MODE.BLOCKED_DATABASE,
      section: z.auth.AuthView.SECTION.BLOCKED,
    };

    this.switch_ui(switch_params);
  }

  _show_blocked_tabs() {
    const switch_params = {
      mode: z.auth.AuthView.MODE.BLOCKED_TABS,
      section: z.auth.AuthView.SECTION.BLOCKED,
    };

    this.switch_ui(switch_params);
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
    let animation_params;
    let direction;

    if (this.visible_section() === z.auth.AuthView.SECTION.ACCOUNT) {
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
    } else if (switch_params.section === z.auth.AuthView.SECTION.BLOCKED) {
      this.blocked_mode(switch_params.mode);
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
      this._show_method(z.auth.AuthView.MODE.ACCOUNT_LOGIN);
      this.visible_method(z.auth.AuthView.MODE.ACCOUNT_LOGIN);
    } else if (switch_params.method && this.visible_method() !== switch_params.method) {
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

    $(`.btn-login-${method}`).addClass('is-active');

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
          animation_promises.push(
            new Promise(resolve => {
              $(old_component[0])
                .addClass(`outgoing-${animation_params.direction}`)
                .one(z.util.alias.animationend, function() {
                  resolve();
                  $(this).css({
                    display: '',
                    opacity: '',
                  });
                });
            })
          );
        }

        if (new_component.length) {
          animation_promises.push(
            new Promise(resolve => {
              new_component
                .addClass(`incoming-${animation_params.direction}`)
                .one(z.util.alias.animationend, function() {
                  resolve();
                  $(this).css({opacity: 1});
                });
            })
          );
        }

        Promise.all(animation_promises).then(() => {
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
    $('.icon-spinner').fadeIn();
  }

  _show_icon_envelope() {
    $('.icon-envelope').show();
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

      case z.auth.AuthView.MODE.BLOCKED_COOKIES:
        this._show_blocked_cookies();
        break;

      case z.auth.AuthView.MODE.BLOCKED_DATABASE:
        this._show_blocked_database();
        break;

      case z.auth.AuthView.MODE.BLOCKED_TABS:
        this._show_blocked_tabs();
        break;

      case z.auth.AuthView.MODE.HISTORY:
        this._show_history();
        break;

      case z.auth.AuthView.MODE.LIMIT:
        this._show_limit();
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
        this._show_account_login();
    }
  }

  //##############################################################################
  // Validation errors
  //##############################################################################

  /**
   * Add a validation error.
   *
   * @private
   * @param {string} errorMessage - The error message
   * @param {Array<string>|string} [types] - Input type(s) of validation error
   * @returns {undefined} No return value
   */
  _add_error(errorMessage, types) {
    const error = new z.auth.ValidationError(types || [], errorMessage);
    this.validation_errors.push(error);

    error.types.map(type => {
      switch (type) {
        case z.auth.AuthView.TYPE.CODE:
          this.failed_validation_code(true);
          break;

        case z.auth.AuthView.TYPE.EMAIL:
          this.failed_validation_email(true);
          break;

        case z.auth.AuthView.TYPE.PASSWORD:
          this.failed_validation_password(true);
          break;

        case z.auth.AuthView.TYPE.PHONE:
          this.failed_validation_phone(true);
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
    this.failed_validation_password(false);
    this.failed_validation_phone(false);
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
   * Check whether a form has errors.
   * @private
   * @returns {boolean} Form has an error
   */
  _has_errors() {
    let has_error = false;
    if (this.validation_errors().length > 0) {
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

      case z.auth.AuthView.TYPE.PASSWORD:
        this.failed_validation_password(false);
        break;

      case z.auth.AuthView.TYPE.PHONE:
        this.failed_validation_phone(false);
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
      return this._add_error(t('authErrorEmailMissing'), z.auth.AuthView.TYPE.EMAIL);
    }

    if (!z.util.isValidEmail(username)) {
      this._add_error(t('authErrorEmailMalformed'), z.auth.AuthView.TYPE.EMAIL);
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

    if (mode === z.auth.AuthView.MODE.VERIFY_ACCOUNT) {
      this._validate_email();
    }

    const password_modes = [z.auth.AuthView.MODE.VERIFY_ACCOUNT, z.auth.AuthView.MODE.VERIFY_PASSWORD];
    if (password_modes.includes(mode)) {
      const isValidPassword = this._validatePassword(this.password());
      if (!isValidPassword) {
        const isPasswordVerification = mode === z.auth.AuthView.MODE.VERIFY_PASSWORD;
        const errorMessage = isPasswordVerification
          ? t('authErrorPasswordWrong', {minLength: ValidationUtil.DEFAULT_PASSWORD_MIN_LENGTH})
          : t('authErrorPasswordShort');
        this._add_error(errorMessage, z.auth.AuthView.TYPE.PASSWORD);
      }
    }

    const phone_modes = [z.auth.AuthView.MODE.ACCOUNT_LOGIN, z.auth.AuthView.MODE.VERIFY_PASSWORD];
    if (phone_modes.includes(mode)) {
      this._validate_phone();
    }

    return !this._has_errors();
  }

  /**
   * Validate password input.
   *
   * @private
   * @param {string} password - Password to validate
   * @returns {undefined} No return value
   */
  _validatePassword(password) {
    return new RegExp(ValidationUtil.getNewPasswordPattern()).test(password);
  }

  /**
   * Validate phone input.
   * @private
   * @returns {undefined} No return value
   */
  _validate_phone() {
    if (!z.util.isValidPhoneNumber(this.phone_number_e164())) {
      this._add_error(t('authErrorPhoneNumberInvalid'), z.auth.AuthView.TYPE.PHONE);
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
    this.authRepository.logout().then(() => {
      this.authRepository.deleteAccessToken();
      window.location.replace('/login');
    });
  }

  /**
   * Append parameter to URL if exists.
   * @param {string} url - Previous URL string
   * @returns {string} Updated URL
   */
  _append_existing_parameters(url) {
    AuthViewModel.CONFIG.FORWARDED_URL_PARAMETERS.forEach(parameter_name => {
      url = z.util.URLUtil.forwardParameter(url, parameter_name);
    });

    return url;
  }

  /**
   * User successfully authenticated on the backend side.
   *
   * @note Gets the client and forwards the user to the login.
   * @private
   * @param {boolean} [auto_login=false] - Redirected with auto login parameter
   * @returns {undefined} No return value
   */
  _authentication_successful(auto_login = false) {
    this.logger.info('Logging in');

    this._get_self_user()
      .then(() => this.cryptography_repository.loadCryptobox(this.storageService.db))
      .then(() => this.client_repository.getValidLocalClient())
      .catch(error => {
        const user_missing_email = error.type === z.error.UserError.TYPE.USER_MISSING_EMAIL;
        if (user_missing_email) {
          throw error;
        }

        const client_not_validated = error.type === z.error.ClientError.TYPE.NO_VALID_CLIENT;
        if (client_not_validated) {
          const client_et = this.client_repository.currentClient();
          this.client_repository.currentClient(undefined);
          return this.cryptography_repository.resetCryptobox(client_et).then(deleted_everything => {
            if (deleted_everything) {
              this.logger.info('Database was completely reset. Reinitializing storage...');
              return this.storage_repository.storageService.init(this.self_user().id);
            }
          });
        }
      })
      .then(() => {
        if (this.client_repository.currentClient()) {
          this.logger.info('Active client found. Redirecting to app...');
          return this._redirect_to_app();
        }

        this.logger.info('No active client found. We need to register one...');
        this._register_client(auto_login);
      })
      .catch(error => {
        if (error.type !== z.error.UserError.TYPE.USER_MISSING_EMAIL) {
          this.logger.error(`Login failed: ${error.message}`, error);
          this._add_error(t('authErrorMisc'));
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
    return this.user_repository
      .getSelf()
      .then(userEntity => {
        this.self_user(userEntity);
        this.logger.info(`Retrieved self user: ${this.self_user().id}`);
        this.pending_server_request(false);

        const hasEmailAddress = this.self_user().email();
        const hasPhoneNumber = this.self_user().phone();
        const isIncompletePhoneUser = hasPhoneNumber && !hasEmailAddress;
        if (isIncompletePhoneUser) {
          this._set_hash(z.auth.AuthView.MODE.VERIFY_ACCOUNT);
          throw new z.error.UserError(z.error.UserError.TYPE.USER_MISSING_EMAIL);
        }

        return this.storageService.init(this.self_user().id);
      })
      .then(() => {
        this.client_repository.init(this.self_user());
        return this.self_user();
      });
  }

  /**
   * Check whether the device has a local history.
   * @private
   * @returns {Promise<boolean>} Resolves with whether at least one conversation event was found
   */
  _hasLocalHistory() {
    const eventStoreName = z.storage.StorageSchemata.OBJECT_STORE.EVENTS;
    return this.storageService.getAll(eventStoreName).then(events => events.length > 0);
  }

  /**
   * Redirects to the app after successful login
   * @private
   * @returns {undefined} No return value
   */
  _redirect_to_app() {
    const redirect_url = this._append_existing_parameters('/');
    window.location.replace(redirect_url);
  }

  _register_client(autoLogin) {
    return this.cryptography_repository
      .createCryptobox(this.storageService.db)
      .then(() => this.client_repository.registerClient(autoLogin ? undefined : this.password()))
      .then(clientObservable => {
        this.event_repository.currentClient = clientObservable;
        return this.event_repository.setStreamState(clientObservable().id, true);
      })
      .catch(error => {
        const isNotFound = error.code === z.error.BackendClientError.STATUS_CODE.NOT_FOUND;
        if (isNotFound) {
          return this.logger.warn(`Cannot set starting point on notification stream: ${error.message}`, error);
        }
        throw error;
      })
      .then(() => this.client_repository.getClientsForSelf())
      .then(clientEntities => {
        const numberOfClients = clientEntities ? clientEntities.length : 0;
        this.logger.info(`User has '${numberOfClients}' registered clients`, clientEntities);

        /**
         * Show history screen if:
         *   1. database contains at least one event
         *   2. new local client is temporary
         *   3. there is at least one previously registered client
         */
        return this._hasLocalHistory().then(hasHistory => {
          const shouldShowHistoryInfo = hasHistory || !!numberOfClients || this.client_repository.isTemporaryClient();
          if (shouldShowHistoryInfo) {
            this.deviceReused(hasHistory);
            return this._set_hash(z.auth.AuthView.MODE.HISTORY);
          }

          this._redirect_to_app();
        });
      })
      .catch(error => {
        const isTooManyClients = error.type === z.error.ClientError.TYPE.TOO_MANY_CLIENTS;
        if (isTooManyClients) {
          this.logger.warn('User has already registered the maximum number of clients', error);
          return (window.location.hash = z.auth.AuthView.MODE.LIMIT);
        }
        this.logger.error(`Failed to register a new client: ${error.message}`, error);

        if (autoLogin) {
          window.location.hash = z.auth.AuthView.MODE.ACCOUNT_LOGIN;
        }
      });
  }
}

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

export default AuthViewModel;
