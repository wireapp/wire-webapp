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
import {t} from 'Util/LocalizerUtil';
import {afterRender} from 'Util/util';
import {Config} from '../../auth/config';
import {QUERY_KEY} from '../../auth/route';
import {SIGN_OUT_REASON} from '../../auth/SignOutReason';
import {getURLParameter} from '../../auth/util/urlUtil';
import {ClientRepository} from '../../client/ClientRepository';
import {User} from '../../entity/User';
import {WebAppEvents} from '../../event/WebApp';

export enum APPLOCK_STATE {
  NONE = 'applock.none',
  SETUP = 'applock.setup',
  LOCKED = 'applock.locked',
  FORGOT = 'applock.forgot',
  WIPE_CONFIRM = 'applock.wipe-confirm',
  WIPE_PASSWORD = 'applock.wipe-password',
}

const APP_LOCK_STORAGE = 'app_lock';

const getTimeOut = (queryName: string, configName: 'APPLOCK_SCHEDULED_TIMEOUT' | 'APPLOCK_UNFOCUS_TIMEOUT') => {
  const queryTimeout = parseInt(getURLParameter(queryName), 10);
  const configTimeout = Config.FEATURE && Config.FEATURE[configName];
  const isNotFinite = (num: number) => !Number.isFinite(num);
  if (isNotFinite(queryTimeout) && isNotFinite(configTimeout)) {
    return null;
  }
  if (isNotFinite(queryTimeout)) {
    return configTimeout;
  }
  if (isNotFinite(configTimeout)) {
    return queryTimeout;
  }
  return Math.min(queryTimeout, configTimeout);
};

const getUnfocusAppLockTimeOutinMillis = () => getTimeOut(QUERY_KEY.APPLOCK_UNFOCUS_TIMEOUT, 'APPLOCK_UNFOCUS_TIMEOUT');
const getScheduledAppLockTimeOutinMillis = () =>
  getTimeOut(QUERY_KEY.APPLOCK_SCHEDULED_TIMEOUT, 'APPLOCK_SCHEDULED_TIMEOUT');

const isUnfocusAppLockEnabled = () => getUnfocusAppLockTimeOutinMillis() !== null;
const isScheduledAppLockEnabled = () => getScheduledAppLockTimeOutinMillis() !== null;

export const isAppLockEnabled = () => isUnfocusAppLockEnabled() || isScheduledAppLockEnabled();

export class AppLockViewModel {
  appObserver: MutationObserver;
  headerText: ko.PureComputed<string>;
  isLoading: ko.Observable<boolean>;
  isSetupPasswordAValid: ko.PureComputed<boolean>;
  isSetupPasswordBValid: ko.PureComputed<boolean>;
  isVisible: ko.Observable<boolean>;
  localStorage: Storage;
  modalObserver: MutationObserver;
  passwordRegex: RegExp;
  scheduledTimeOut: number;
  scheduledTimeOutId: number;
  setupPasswordA: ko.Observable<string>;
  setupPasswordB: ko.Observable<string>;
  state: ko.Observable<APPLOCK_STATE>;
  storageKey: ko.PureComputed<string>;
  unfocusTimeOut: number;
  unfocusTimeOutId: number;
  unlockError: ko.Observable<string>;
  wipeError: ko.Observable<string>;

  constructor(private readonly clientRepository: ClientRepository, selfUser: ko.Observable<User>) {
    this.localStorage = window.localStorage;
    this.state = ko.observable(APPLOCK_STATE.NONE);
    this.state.subscribe(() => this.stopObserver(), null, 'beforeChange');
    this.isVisible = ko.observable(false);
    this.isLoading = ko.observable(false);
    this.storageKey = ko.pureComputed(() => `${APP_LOCK_STORAGE}_${selfUser().id}`);
    ko.applyBindings(this, document.getElementById('applock'));

    this.isVisible.subscribe(isVisible => {
      (<HTMLDivElement>document.querySelector('#app')).style.setProperty(
        'filter',
        isVisible ? 'blur(100px)' : '',
        'important',
      );
    });

    this.unfocusTimeOut = Config.FEATURE.APPLOCK_UNFOCUS_TIMEOUT * 1000;
    this.unfocusTimeOutId = 0;

    this.scheduledTimeOut = Config.FEATURE.APPLOCK_SCHEDULED_TIMEOUT * 1000;
    this.scheduledTimeOutId = 0;

    this.headerText = ko.pureComputed(() => {
      switch (this.state()) {
        case APPLOCK_STATE.SETUP:
          return t('modalAppLockSetupTitle');
        case APPLOCK_STATE.LOCKED:
          return t('modalAppLockLockedTitle');
        case APPLOCK_STATE.FORGOT:
          return t('modalAppLockForgotTitle');
        case APPLOCK_STATE.WIPE_CONFIRM:
          return t('modalAppLockWipeConfirmTitle');
        case APPLOCK_STATE.WIPE_PASSWORD:
          return t('modalAppLockWipePasswordTitle');
        default:
          return '';
      }
    });
    this.passwordRegex = new RegExp(ValidationUtil.getNewPasswordPattern(8));
    this.setupPasswordA = ko.observable('');
    this.setupPasswordB = ko.observable('');
    this.isSetupPasswordAValid = ko.pureComputed(() => this.passwordRegex.test(this.setupPasswordA()));
    this.isSetupPasswordBValid = ko.pureComputed(
      () => this.passwordRegex.test(this.setupPasswordB()) && this.setupPasswordB() === this.setupPasswordA(),
    );
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
        document.addEventListener('visibilitychange', this.handleVisibilityChange, false);
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
    this.setupPasswordA('');
    this.setupPasswordB('');
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

  handleVisibilityChange = () => {
    window.clearTimeout(this.unfocusTimeOutId);
    const isHidden = document.visibilityState === 'hidden';
    if (isHidden) {
      this.unfocusTimeOutId = window.setTimeout(this.showAppLock, getUnfocusAppLockTimeOutinMillis() * 1000);
    }
  };

  startScheduledTimeout = () => {
    if (isScheduledAppLockEnabled()) {
      window.clearTimeout(this.scheduledTimeOutId);
      this.scheduledTimeOutId = window.setTimeout(this.showAppLock, getScheduledAppLockTimeOutinMillis() * 1000);
    }
  };

  showAppLock = () => {
    const hasCode = !!this.getStored();
    this.state(hasCode ? APPLOCK_STATE.LOCKED : APPLOCK_STATE.SETUP);
    this.isVisible(true);
  };

  onUnlock = async (form: HTMLFormElement) => {
    const enteredCode = (<HTMLInputElement>form[0]).value;
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
    if (this.setupPasswordA() === this.setupPasswordB()) {
      this.stopObserver();
      await this.setCode(this.setupPasswordA());
      this.isVisible(false);
      this.startScheduledTimeout();
    }
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
    const password = (<HTMLInputElement>form[0]).value;
    try {
      this.isLoading(true);
      const currentClientId = this.clientRepository.currentClient().id;
      await this.clientRepository.clientService.deleteClient(currentClientId, password);
      this.localStorage.removeItem(this.storageKey());
      amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.USER_REQUESTED, true);
    } catch ({code, message}) {
      this.isLoading(false);
      if ([400, 401, 403].includes(code)) {
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

  isSetupScreen = () => this.state() === APPLOCK_STATE.SETUP;
  isLockScreen = () => this.state() === APPLOCK_STATE.LOCKED;
  isForgotScreen = () => this.state() === APPLOCK_STATE.FORGOT;
  isWipeConfirmScreen = () => this.state() === APPLOCK_STATE.WIPE_CONFIRM;
  isWipePasswordScreen = () => this.state() === APPLOCK_STATE.WIPE_PASSWORD;
}
