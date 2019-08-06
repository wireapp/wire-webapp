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
import {murmurhash3} from 'Util/util';
import {AuthService} from '../../auth/AuthService';
import {SIGN_OUT_REASON} from '../../auth/SignOutReason';
import {config} from '../../config';
import {WebAppEvents} from '../../event/WebApp';

enum APPLOCK_STATES {
  NONE = 'applock.none',
  SETUP = 'applock.setup',
  LOCKED = 'applock.locked',
  FORGOT = 'applock.forgot',
  WIPE_CONFIRM = 'applock.wipe-confirm',
  WIPE_PASSWORD = 'applock.wipe-password',
}

enum APPLOCK_STORAGE {
  CODE = 'applock_code',
  SALT = 'applock_salt',
}

export class AppLockViewModel {
  timeOutId: number;
  timeOut: number;
  code: string;
  state: ko.Observable<APPLOCK_STATES>;
  isVisible: ko.Observable<boolean>;
  headerText: ko.PureComputed<string>;
  localStorage: Storage;
  setupPasswordA: ko.Observable<string>;
  setupPasswordB: ko.Observable<string>;
  passwordRegex: RegExp;
  isSetupPasswordAValid: ko.PureComputed<boolean>;
  isSetupPasswordBValid: ko.PureComputed<boolean>;
  unlockError: ko.Observable<string>;
  authService: AuthService;
  wipeError: ko.Observable<string>;
  isLoading: ko.Observable<boolean>;

  constructor(authService: AuthService) {
    this.authService = authService;
    this.state = ko.observable(APPLOCK_STATES.NONE);
    this.isVisible = ko.observable(false);
    this.isLoading = ko.observable(false);
    ko.applyBindings(this, document.getElementById('applock'));

    const timeOut = config.FEATURE.APPLOCK_TIMEOUT;

    this.isVisible.subscribe(isVisible => {
      document.querySelector('#app').classList.toggle('blurred', isVisible);
    });

    this.localStorage = window.localStorage;
    this.timeOut = timeOut;
    this.timeOutId = 0;
    this.headerText = ko.pureComputed(() => {
      switch (this.state()) {
        case APPLOCK_STATES.SETUP:
          return 'Set Application lock password';
        case APPLOCK_STATES.LOCKED:
          return 'Application is locked due to inactivity.';
        case APPLOCK_STATES.FORGOT:
          return 'Don’t know your Application lock password?';
        case APPLOCK_STATES.WIPE_CONFIRM:
          return 'Do you really want to Wipe the database?';
        case APPLOCK_STATES.WIPE_PASSWORD:
          return 'Enter your password to wipe database';
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
    if (Number.isInteger(timeOut)) {
      if (!this.getCode()) {
        this.showAppLock();
      }
      document.addEventListener('visibilitychange', this.handleVisibilityChange, false);
    }
  }

  getCode = () => this.localStorage.getItem(APPLOCK_STORAGE.CODE);
  hashCode = (code: string) => {
    const seed = parseInt(this.localStorage.getItem(APPLOCK_STORAGE.SALT), 16);
    return murmurhash3(code, seed).toString(16);
  };

  setCode = (code: string) => {
    const seed = Math.trunc(Math.random() * 1024);
    this.localStorage.setItem(APPLOCK_STORAGE.SALT, seed.toString(16));
    this.localStorage.setItem(APPLOCK_STORAGE.CODE, this.hashCode(code));
  };

  onClosed = () => this.state(APPLOCK_STATES.NONE);

  handleVisibilityChange = () => {
    window.clearTimeout(this.timeOutId);
    const isHidden = document.visibilityState === 'hidden';
    if (isHidden) {
      this.timeOutId = window.setTimeout(this.showAppLock, this.timeOut);
    }
  };

  showAppLock = () => {
    this.state(this.getCode() ? APPLOCK_STATES.LOCKED : APPLOCK_STATES.SETUP);
    this.isVisible(true);
  };

  onUnlock = (form: HTMLFormElement) => {
    const enteredCode = (<HTMLInputElement>form[0]).value;
    if (this.hashCode(enteredCode) === this.getCode()) {
      this.isVisible(false);
      return;
    }
    this.unlockError('Wrong Passphrase');
  };

  onSetCode = (form: HTMLFormElement) => {
    const firstCode = (<HTMLInputElement>form[0]).value;
    const secondCode = (<HTMLInputElement>form[1]).value;
    if (firstCode === secondCode) {
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
    const password = (<HTMLInputElement>form[0]).value;
    try {
      this.isLoading(true);
      await this.authService.validatePassword(password);
      this.localStorage.removeItem(APPLOCK_STORAGE.CODE);
      this.localStorage.removeItem(APPLOCK_STORAGE.SALT);
      amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.USER_REQUESTED, true);
      this.isVisible(false);
    } catch ({code, message}) {
      this.isLoading(false);
      if ([400, 401, 403].includes(code)) {
        return this.wipeError('Wrong password');
      }
      this.wipeError(message);
    }
  };

  onGoBack = () => this.state(APPLOCK_STATES.LOCKED);
  onClickForgot = () => this.state(APPLOCK_STATES.FORGOT);
  onClickWipe = () => this.state(APPLOCK_STATES.WIPE_CONFIRM);
  onClickWipeConfirm = () => this.state(APPLOCK_STATES.WIPE_PASSWORD);

  isSetupScreen = () => this.state() === APPLOCK_STATES.SETUP;
  isLockScreen = () => this.state() === APPLOCK_STATES.LOCKED;
  isForgotScreen = () => this.state() === APPLOCK_STATES.FORGOT;
  isWipeConfirmScreen = () => this.state() === APPLOCK_STATES.WIPE_CONFIRM;
  isWipePasswordScreen = () => this.state() === APPLOCK_STATES.WIPE_PASSWORD;
}
