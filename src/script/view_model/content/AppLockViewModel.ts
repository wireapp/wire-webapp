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
import ko from 'knockout';
import {config} from '../../config';
import {PropertiesRepository} from '../../properties/PropertiesRepository';
import {PROPERTIES_TYPE} from '../../properties/PropertiesType';

enum APPLOCK_STATES {
  NONE = 'applock.none',
  SETUP = 'applock.setup',
  LOCKED = 'applock.locked',
  FORGOT = 'applock.forgot',
  WIPE_CONFIRM = 'applock.wipe-confirm',
  WIPE_PASSWORD = 'applock.wipe-password',
}

export class AppLockViewModel {
  timeOutId: number;
  timeOut: number;
  code: string;
  propertiesRepository: PropertiesRepository;
  state: ko.Observable<APPLOCK_STATES>;
  isVisible: ko.PureComputed<boolean>;
  headerText: ko.PureComputed<string>;

  constructor(propertiesRepository: PropertiesRepository) {
    this.state = ko.observable(APPLOCK_STATES.NONE);
    this.isVisible = ko.pureComputed(() => this.state() !== APPLOCK_STATES.NONE);
    ko.applyBindings(this, document.getElementById('applock'));

    const timeOut = config.FEATURE.APP_LOCK_TIMEOUT;
    if (!Number.isInteger(timeOut)) {
      return;
    }

    this.isVisible.subscribe(isVisible => {
      document.querySelector('#app').classList.toggle('blurred', isVisible);
    });

    this.propertiesRepository = propertiesRepository;
    if (!this.loadCode()) {
      this.showAppLock();
    }
    this.timeOut = timeOut;
    document.addEventListener('visibilitychange', this.handleVisibilityChange, false);
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
  }

  loadCode = () => this.propertiesRepository.getPreference(PROPERTIES_TYPE.APPLOCK.CODE);

  handleVisibilityChange = () => {
    window.clearTimeout(this.timeOutId);
    const isHidden = document.visibilityState === 'hidden';
    if (isHidden) {
      this.timeOutId = window.setTimeout(this.showAppLock, this.timeOut);
    }
  };

  showAppLock = () => {
    this.state(this.loadCode() ? APPLOCK_STATES.LOCKED : APPLOCK_STATES.SETUP);
  };

  onEnterCode = (enteredCode: string) => {
    if (enteredCode === this.loadCode()) {
      this.state(APPLOCK_STATES.NONE);
      return;
    }
  };

  onSetCode = (form: HTMLFormElement) => {
    const firstCode = (<HTMLInputElement>form[0]).value;
    const secondCode = (<HTMLInputElement>form[1]).value;
    if (firstCode === secondCode) {
      this.propertiesRepository.savePreference(PROPERTIES_TYPE.APPLOCK.CODE, firstCode);
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
