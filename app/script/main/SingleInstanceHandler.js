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

//@ts-check

'use strict';

window.z = window.z || {};
window.z.main = z.main || {};

z.main.SingleInstanceHandler = (() => {
  const instanceListeners = [];
  let checkInterval = undefined;

  return class SingleInstanceHandler {
    static get CONFIG() {
      return {
        TABS_CHECK: {
          COOKIE_NAME: 'app_opened',
          INTERVAL: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND,
        },
      };
    }

    constructor(instanceId) {
      this.instanceId = instanceId;
    }

    /**
     * Set the cookie to verify we are running a single instace tab.
     * returns true if the instance has been registered successfully
     * returns false if the app is already running in another instance
     *
     * @returns {boolean} - has the app being registered successfully
     */
    registerInstance() {
      if (!this.instanceId) {
        throw new Error('No instance id provided');
      }
      const cookieName = SingleInstanceHandler.CONFIG.TABS_CHECK.COOKIE_NAME;
      if (!!Cookies.get(cookieName)) {
        return false;
      }
      Cookies.set(cookieName, {appInstanceId: this.instanceId});
      this._startSingleInstanceCheck();
      return true;
    }

    deregisterInstance() {
      const singleInstanceCookie = Cookies.getJSON(SingleInstanceHandler.CONFIG.TABS_CHECK.COOKIE_NAME);

      const isOwnInstanceId = singleInstanceCookie && singleInstanceCookie.appInstanceId === this.instanceId;
      if (isOwnInstanceId) {
        Cookies.remove(SingleInstanceHandler.CONFIG.TABS_CHECK.COOKIE_NAME);
      }
    }

    addExtraInstanceStartedListener(listener) {
      instanceListeners.push(listener);
      if (instanceListeners.length === 1) {
        this._startSingleInstanceCheck();
      }
    }

    removeExtraInstanceStartedListener(listener) {
      const index = instanceListeners.indexOf(listener);
      instanceListeners.splice(index, 1);
      if (instanceListeners.length === 0) {
        this._stopSingleInstanceCheck();
      }
    }

    _isSingleRunningInstance() {
      if (z.util.Environment.electron) {
        return true;
      }
      const singleInstanceCookie = Cookies.getJSON(SingleInstanceHandler.CONFIG.TABS_CHECK.COOKIE_NAME);

      return singleInstanceCookie && singleInstanceCookie.appInstanceId === this.instanceId;
    }

    _checkSingleInstance() {
      if (!this._isSingleRunningInstance()) {
        // warn listeners if the app has started in another instance
        instanceListeners.forEach(listener => listener());
      }
    }

    _startSingleInstanceCheck() {
      if (checkInterval) {
        this._stopSingleInstanceCheck();
      }
      checkInterval = window.setInterval(
        this._checkSingleInstance.bind(this),
        SingleInstanceHandler.CONFIG.TABS_CHECK.INTERVAL
      );
    }

    _stopSingleInstanceCheck() {
      window.clearInterval(checkInterval);
    }
  };
})();
