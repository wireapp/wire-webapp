/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {ValidationUtil} from '@wireapp/commons';
import {amplify} from 'amplify';
import ko from 'knockout';
import sodium from 'libsodium-wrappers-sumo';
import {WebAppEvents} from '@wireapp/webapp-events';
import {UrlUtil} from '@wireapp/commons';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {t} from 'Util/LocalizerUtil';
import {afterRender} from 'Util/util';
import {QUERY_KEY} from '../../auth/route';
import {SIGN_OUT_REASON} from '../../auth/SignOutReason';
import type {ClientRepository} from '../../client/ClientRepository';
import {Config} from '../../Config';
import type {User} from '../../entity/User';
import {container} from 'tsyringe';
import {ClientState} from '../../client/ClientState';
import {TeamState} from '../../team/TeamState';

export enum APPLOCK_STATE {
  FORGOT = 'applock.forgot',
  LOCKED = 'applock.locked',
  NONE = 'applock.none',
  SETUP = 'applock.setup',
  SETUP_CHANGE = 'applock.setup_change',
  WIPE_CONFIRM = 'applock.wipe-confirm',
  WIPE_PASSWORD = 'applock.wipe-password',
}

const APP_LOCK_STORAGE = 'app_lock';

const getInactivityTimeout = () => {
  const teamState = container.resolve(TeamState);
  const appLock = teamState.teamFeatures()['appLock'];
  if (appLock.status === 'enabled') {
    return appLock.config.inactivity_timeout_secs;
  }
  return null;
};

const getTimeout = (queryName: string, configName: 'APPLOCK_SCHEDULED_TIMEOUT' | 'APPLOCK_UNFOCUS_TIMEOUT') => {
  const queryTimeout = parseInt(UrlUtil.getURLParameter(queryName), 10);
  const backendTimeout = getInactivityTimeout();
  const configTimeout = Config.getConfig().FEATURE && Config.getConfig().FEATURE[configName];

  console.info('###', queryTimeout, configTimeout, backendTimeout);

  if (Number.isFinite(queryTimeout)) {
    return queryTimeout;
  }
  if (Number.isFinite(backendTimeout)) {
    return backendTimeout;
  }
  if (Number.isFinite(configTimeout)) {
    return configTimeout;
  }
  return null;
};

const getUnfocusAppLockTimeoutInSeconds = () =>
  getTimeout(QUERY_KEY.APPLOCK_UNFOCUS_TIMEOUT, 'APPLOCK_UNFOCUS_TIMEOUT');
const getScheduledAppLockTimeoutInSeconds = () =>
  getTimeout(QUERY_KEY.APPLOCK_SCHEDULED_TIMEOUT, 'APPLOCK_SCHEDULED_TIMEOUT');

const isUnfocusAppLockEnabled = () => getUnfocusAppLockTimeoutInSeconds() !== null;
const isScheduledAppLockEnabled = () => getScheduledAppLockTimeoutInSeconds() !== null;

export const isAppLockEnabled = () => isUnfocusAppLockEnabled() || isScheduledAppLockEnabled();

export class AppLockViewModel {
  appObserver: MutationObserver;
  headerText: ko.PureComputed<string>;
  isLoading: ko.Observable<boolean>;
  isSetupPassphraseLength: ko.PureComputed<boolean>;
  isSetupPassphraseLower: ko.PureComputed<boolean>;
  isSetupPassphraseUpper: ko.PureComputed<boolean>;
  isSetupPassphraseDigit: ko.PureComputed<boolean>;
  isSetupPassphraseSpecial: ko.PureComputed<boolean>;
  isSetupPassphraseValid: ko.PureComputed<boolean>;
  isSetupPasswordBValid: ko.PureComputed<boolean>;
  isVisible: ko.Observable<boolean>;
  localStorage: Storage;
  modalObserver: MutationObserver;
  passwordRegex: RegExp;
  passwordRegexLength: RegExp;
  passwordRegexLower: RegExp;
  passwordRegexUpper: RegExp;
  passwordRegexDigit: RegExp;
  passwordRegexSpecial: RegExp;
  scheduledTimeout: number;
  scheduledTimeoutId: number;
  minPasswordLength: number;
  setupPassphrase: ko.Observable<string>;
  state: ko.Observable<APPLOCK_STATE>;
  storageKey: ko.PureComputed<string>;
  unfocusTimeout: number;
  unfocusTimeoutId: number;
  unlockError: ko.Observable<string>;
  wipeError: ko.Observable<string>;

  constructor(
    private readonly clientRepository: ClientRepository,
    selfUser: ko.Observable<User>,
    private readonly clientState = container.resolve(ClientState),
    private readonly teamState = container.resolve(TeamState),
  ) {
    this.localStorage = window.localStorage;
    this.state = ko.observable(APPLOCK_STATE.NONE);
    this.state.subscribe(() => this.stopObserver(), null, 'beforeChange');
    this.isVisible = ko.observable(false);
    this.isLoading = ko.observable(false);
    this.storageKey = ko.pureComputed(() => `${APP_LOCK_STORAGE}_${selfUser().id}`);
    ko.applyBindings(this, document.getElementById('applock'));

    this.isVisible.subscribe(isVisible => {
      const app: HTMLDivElement = window.document.querySelector('#app');
      app.style.setProperty('filter', isVisible ? 'blur(100px)' : '', 'important');
    });

    this.unfocusTimeout = Config.getConfig().FEATURE.APPLOCK_UNFOCUS_TIMEOUT * 1000;
    this.unfocusTimeoutId = 0;

    this.scheduledTimeout = Config.getConfig().FEATURE.APPLOCK_SCHEDULED_TIMEOUT * 1000;
    this.scheduledTimeoutId = 0;

    this.minPasswordLength = Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH;

    this.headerText = ko.pureComputed(() => {
      switch (this.state()) {
        case APPLOCK_STATE.SETUP_CHANGE:
          return t('modalAppLockSetupChangeTitle');
        case APPLOCK_STATE.SETUP:
          return t('modalAppLockSetupTitle');
        case APPLOCK_STATE.LOCKED:
          return t('modalAppLockLockedTitle');
        case APPLOCK_STATE.FORGOT:
          return t('modalAppLockForgotTitle');
        case APPLOCK_STATE.WIPE_CONFIRM:
          return t('modalAppLockWipeConfirmTitle');
        case APPLOCK_STATE.WIPE_PASSWORD:
          return t('modalAppLockWipePasswordTitle', Config.getConfig().BRAND_NAME);
        default:
          return '';
      }
    });

    this.passwordRegexLength = new RegExp(`^.{${this.minPasswordLength},}$`);
    this.passwordRegexLower = new RegExp(/(?=.*[a-z])/);
    this.passwordRegexUpper = new RegExp(/(?=.*[A-Z])/);
    this.passwordRegexDigit = new RegExp(/(?=.*[0-9])/);
    this.passwordRegexSpecial = new RegExp(/(?=.*[!@#$%^&*(),.?":{}|<>])/);

    this.passwordRegex = new RegExp(ValidationUtil.getNewPasswordPattern(this.minPasswordLength));
    this.setupPassphrase = ko.observable('');
    this.isSetupPassphraseValid = ko.pureComputed(() => this.passwordRegex.test(this.setupPassphrase()));
    this.isSetupPassphraseLength = ko.pureComputed(() => this.passwordRegexLength.test(this.setupPassphrase()));
    this.isSetupPassphraseLower = ko.pureComputed(() => this.passwordRegexLower.test(this.setupPassphrase()));
    this.isSetupPassphraseUpper = ko.pureComputed(() => this.passwordRegexUpper.test(this.setupPassphrase()));
    this.isSetupPassphraseDigit = ko.pureComputed(() => this.passwordRegexDigit.test(this.setupPassphrase()));
    this.isSetupPassphraseSpecial = ko.pureComputed(() => this.passwordRegexSpecial.test(this.setupPassphrase()));
    this.unlockError = ko.observable('');
    this.wipeError = ko.observable('');
    this.appObserver = new MutationObserver(mutationRecords => {
      const [{attributeName}] = mutationRecords;
      if (attributeName === 'style') {
        amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.USER_REQUESTED);
      }
    });
    this.modalObserver = new MutationObserver(() => {
      const modalInDOM = document.querySelector('[data-uie-name="applock-modal"]');
      if (!modalInDOM) {
        amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.USER_REQUESTED);
      }
    });
    if (isAppLockEnabled()) {
      this.showAppLock();
      if (isUnfocusAppLockEnabled()) {
        window.addEventListener('blur', () => {
          this.clearAppLockTimeout();
          this.startAppLockTimeout();
        });
        window.addEventListener('focus', this.clearAppLockTimeout);
      }
      this.startPassphraseObserver();
    }
    amplify.subscribe(WebAppEvents.PREFERENCES.CHANGE_APP_LOCK_PASSPHRASE, this.changePassphrase);
  }

  getStored = () => this.localStorage.getItem(this.storageKey());

  setCode = async (code: string) => {
    this.stopPassphraseObserver();
    await sodium.ready;
    const hashed = sodium.crypto_pwhash_str(
      code,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    );
    this.localStorage.setItem(this.storageKey(), hashed);
    this.startPassphraseObserver();
  };

  onClosed = () => {
    this.state(APPLOCK_STATE.NONE);
    this.setupPassphrase('');
  };

  handlePassphraseStorageEvent = ({key, oldValue}: StorageEvent) => {
    if (key === this.storageKey()) {
      this.localStorage.setItem(this.storageKey(), oldValue);
    }
  };

  startPassphraseObserver = () => window.addEventListener('storage', this.handlePassphraseStorageEvent);
  stopPassphraseObserver = () => window.removeEventListener('storage', this.handlePassphraseStorageEvent);

  startObserver = () => {
    afterRender(() => {
      this.modalObserver.observe(document.querySelector('#wire-main'), {
        childList: true,
        subtree: true,
      });
      this.appObserver.observe(document.querySelector('#app'), {attributes: true});
    });
  };

  stopObserver = () => {
    this.modalObserver.disconnect();
    this.appObserver.disconnect();
  };

  clearAppLockTimeout = () => {
    window.clearTimeout(this.unfocusTimeoutId);
  };

  startAppLockTimeout = () => {
    this.unfocusTimeoutId = window.setTimeout(this.showAppLock, getUnfocusAppLockTimeoutInSeconds() * 1000);
  };

  startScheduledTimeout = () => {
    if (isScheduledAppLockEnabled()) {
      window.clearTimeout(this.scheduledTimeoutId);
      this.scheduledTimeoutId = window.setTimeout(this.showAppLock, getScheduledAppLockTimeoutInSeconds() * 1000);
    }
  };

  showAppLock = () => {
    const hasCode = !!this.getStored();
    this.state(hasCode ? APPLOCK_STATE.LOCKED : APPLOCK_STATE.SETUP);
    this.isVisible(true);
  };

  onUnlock = async (form: HTMLFormElement) => {
    const enteredCode = (form[0] as HTMLInputElement).value;
    const hashedCode = this.getStored();
    await sodium.ready;
    if (sodium.crypto_pwhash_str_verify(hashedCode, enteredCode)) {
      this.stopObserver();
      this.isVisible(false);
      this.startScheduledTimeout();
      return;
    }
    this.unlockError(t('modalAppLockLockedError'));
  };

  onSetCode = async () => {
    this.stopObserver();
    await this.setCode(this.setupPassphrase());
    this.isVisible(false);
    this.startScheduledTimeout();
  };

  clearUnlockError = () => {
    this.unlockError('');
    return true;
  };

  clearWipeError = () => {
    this.wipeError('');
    return true;
  };

  onWipeDatabase = async (form: HTMLFormElement) => {
    this.stopObserver();
    const password = (form[0] as HTMLInputElement).value;
    try {
      this.isLoading(true);
      const currentClientId = this.clientState.currentClient().id;
      await this.clientRepository.clientService.deleteClient(currentClientId, password);
      this.localStorage.removeItem(this.storageKey());
      amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.USER_REQUESTED, true);
    } catch ({code, message}) {
      this.isLoading(false);
      if ([HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.FORBIDDEN].includes(code)) {
        return this.wipeError(t('modalAppLockWipePasswordError'));
      }
      this.wipeError(message);
    }
  };

  changePassphrase = () => {
    this.state(APPLOCK_STATE.SETUP);
    this.isVisible(true);
  };

  onGoBack = () => this.state(APPLOCK_STATE.LOCKED);
  onClickForgot = () => this.state(APPLOCK_STATE.FORGOT);
  onClickWipe = () => this.state(APPLOCK_STATE.WIPE_CONFIRM);
  onClickWipeConfirm = () => this.state(APPLOCK_STATE.WIPE_PASSWORD);

  isSetupChange = () => this.state() === APPLOCK_STATE.SETUP_CHANGE;
  isSetupScreen = () => this.state() === APPLOCK_STATE.SETUP;
  isLockScreen = () => this.state() === APPLOCK_STATE.LOCKED;
  isForgotScreen = () => this.state() === APPLOCK_STATE.FORGOT;
  isWipeConfirmScreen = () => this.state() === APPLOCK_STATE.WIPE_CONFIRM;
  isWipePasswordScreen = () => this.state() === APPLOCK_STATE.WIPE_PASSWORD;
}
