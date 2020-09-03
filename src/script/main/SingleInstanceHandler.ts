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

import Cookies from 'js-cookie';

import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {Runtime} from '@wireapp/commons';

let checkIntervalId = 0;

const CONFIG = {
  COOKIE_NAME: 'app_opened',
  INTERVAL: TIME_IN_MILLIS.SECOND,
};

/**
 * Class responsible for checking that only the current instance of the app is running.
 */
export class SingleInstanceHandler {
  instanceId?: string;
  onOtherInstanceStarted?: () => void;

  /**
   * @param onOtherInstanceStarted A callback to be called if another instance starts.
   * If provided, will also run an interval that checks the instance integrity once an instance is registered
   */
  constructor(onOtherInstanceStarted?: () => void) {
    this.instanceId = undefined;
    this.onOtherInstanceStarted = onOtherInstanceStarted;
  }

  /**
   * Set the cookie to verify we are running a single instance tab.
   * Returns `true` if the instance has been registered successfully.
   * Returns `false` if the app is already running in another instance.
   *
   * Side effects: will also start the interval check if a callback was provided in the constructor
   *
   * @param instanceId The instance id to register.
   * @returns Was the app registered successfully.
   */
  registerInstance(instanceId: string): boolean {
    this.instanceId = instanceId;
    const cookieName = CONFIG.COOKIE_NAME;
    if (!!Cookies.get(cookieName)) {
      return false;
    }
    Cookies.set(
      cookieName,
      {appInstanceId: this.instanceId},
      {
        sameSite: 'Lax',
      },
    );
    if (this.onOtherInstanceStarted) {
      this._startSingleInstanceCheck();
    }
    return true;
  }

  /**
   * Removes the cookie that keeps track of the running instance.
   *
   * Side Effects: will also stop the interval check
   *
   * @param forceRemoval Do not check that the instance removing it is the current instance.
   */
  deregisterInstance(forceRemoval = false): void {
    const singleInstanceCookie = Cookies.getJSON(CONFIG.COOKIE_NAME);

    const isOwnInstanceId = singleInstanceCookie?.appInstanceId === this.instanceId;
    if (forceRemoval || isOwnInstanceId) {
      Cookies.remove(CONFIG.COOKIE_NAME);
      this._stopSingleInstanceCheck();
    }
  }

  /**
   * Returns `true` if another instance is running.
   * Does not check for the id of the running instance and thus cannot be
   * invoked once the registering of the current instance has been done.
   *
   * @throws When the current app has already been registered.
   */
  hasOtherRunningInstance(): boolean {
    if (this.instanceId) {
      throw new Error('Current instance has been registered, cannot check other running instances');
    }

    return !!Cookies.get(CONFIG.COOKIE_NAME);
  }

  private _isSingleRunningInstance(): boolean {
    if (Runtime.isDesktopApp()) {
      return true;
    }
    const singleInstanceCookie = Cookies.getJSON(CONFIG.COOKIE_NAME);

    return singleInstanceCookie?.appInstanceId === this.instanceId;
  }

  private _checkSingleInstance(): void {
    if (!this._isSingleRunningInstance()) {
      // warn listeners if the app has started in another instance
      this.onOtherInstanceStarted();
    }
  }

  private _startSingleInstanceCheck(): void {
    this._stopSingleInstanceCheck();
    checkIntervalId = window.setInterval(this._checkSingleInstance.bind(this), CONFIG.INTERVAL);
  }

  private _stopSingleInstanceCheck(): void {
    if (checkIntervalId) {
      window.clearInterval(checkIntervalId);
    }
    checkIntervalId = 0;
  }
}
