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
import {t} from 'Util/LocalizerUtil';
import {afterRender, murmurhash3} from 'Util/util';
import {AuthService} from '../../auth/AuthService';
import {SIGN_OUT_REASON} from '../../auth/SignOutReason';
import {config} from '../../config';
import {User} from '../../entity/User';
import {WebAppEvents} from '../../event/WebApp';

enum APPLOCK_STATE {
  NONE = 'applock.none',
  SETUP = 'applock.setup',
  LOCKED = 'applock.locked',
  FORGOT = 'applock.forgot',
  WIPE_CONFIRM = 'applock.wipe-confirm',
  WIPE_PASSWORD = 'applock.wipe-password',
}

const APP_LOCK_STORAGE = 'app_lock';

export const isAppLockEnabled = () => Number.isInteger(config.FEATURE.APPLOCK_TIMEOUT);

export class AppLockViewModel {
  appObserver: MutationObserver;
  authService: AuthService;
  headerText: ko.PureComputed<string>;
  isLoading: ko.Observable<boolean>;
  isSetupPasswordAValid: ko.PureComputed<boolean>;
  isSetupPasswordBValid: ko.PureComputed<boolean>;
  isVisible: ko.Observable<boolean>;
  localStorage: Storage;
  modalObserver: MutationObserver;
  passwordRegex: RegExp;
  setupPasswordA: ko.Observable<string>;
  setupPasswordB: ko.Observable<string>;
  state: ko.Observable<APPLOCK_STATE>;
  storageKey: ko.PureComputed<string>;
  timeOut: number;
  timeOutId: number;
  unlockError: ko.Observable<string>;
  wipeError: ko.Observable<string>;

  constructor(authService: AuthService, selfUser: ko.Observable<User>) {
    this.authService = authService;
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

    this.timeOut = config.FEATURE.APPLOCK_TIMEOUT * 1000;
    this.timeOutId = 0;
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
    this.modalObserver = new MutationObserver(mutationRecords => {
      const isApplockAffected = mutationRecords.some(({removedNodes}) =>
        Array.from(removedNodes).some(
          (removedNode: HTMLElement) => removedNode.dataset && removedNode.dataset.uieName === 'applock-modal',
        ),
      );
      if (isApplockAffected) {
        amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.USER_REQUESTED);
      }
    });
    if (isAppLockEnabled()) {
      this.showAppLock();
      document.addEventListener('visibilitychange', this.handleVisibilityChange, false);
      this.startPassphraseObserver();
    }
    amplify.subscribe(WebAppEvents.PREFERENCES.CHANGE_APP_LOCK_PASSPHRASE, this.changePassphrase);
  }

  getStored = () => JSON.parse(this.localStorage.getItem(this.storageKey())) || {};
  getSalt = () => parseInt(this.getStored()['salt'], 16);
  getCode = () => this.getStored()['code'];
  hashCode = (code: string, salt: number) => murmurhash3(code, salt).toString(16);

  setCode = (code: string) => {
    const seed = Math.trunc(Math.random() * 1024);
    this.stopPassphraseObserver();
    this.localStorage.setItem(
      this.storageKey(),
      JSON.stringify({
        code: this.hashCode(code, seed),
        salt: seed.toString(16),
      }),
    );
    this.startPassphraseObserver();
  };

  onClosed = () => this.state(APPLOCK_STATE.NONE);

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
    window.clearTimeout(this.timeOutId);
    const isHidden = document.visibilityState === 'hidden';
    if (isHidden) {
      this.timeOutId = window.setTimeout(this.showAppLock, this.timeOut);
    }
  };

  showAppLock = () => {
    const hasCode = !!this.getCode();
    this.state(hasCode ? APPLOCK_STATE.LOCKED : APPLOCK_STATE.SETUP);
    this.isVisible(true);
  };

  onUnlock = (form: HTMLFormElement) => {
    const enteredCode = (<HTMLInputElement>form[0]).value;
    const salt = this.getSalt();
    if (this.hashCode(enteredCode, salt) === this.getCode()) {
      this.stopObserver();
      this.isVisible(false);
      return;
    }
    this.unlockError(t('modalAppLockLockedError'));
  };

  onSetCode = (form: HTMLFormElement) => {
    const firstCode = (<HTMLInputElement>form[0]).value;
    const secondCode = (<HTMLInputElement>form[1]).value;
    if (firstCode === secondCode) {
      this.stopObserver();
      this.setCode(firstCode);
      this.isVisible(false);
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
      await this.authService.validatePassword(password);
      this.localStorage.removeItem(this.storageKey());
      amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.USER_REQUESTED, true);
      this.isVisible(false);
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
