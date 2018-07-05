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
  let checkIntervalId = undefined;

  const CONFIG = {
    COOKIE_NAME: 'app_opened',
    INTERVAL: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND,
  };

  return class SingleInstanceHandler {
    constructor() {
      this.instanceId = undefined;
    }

    /**
     * Set the cookie to verify we are running a single instace tab.
     * returns true if the instance has been registered successfully
     * returns false if the app is already running in another instance
     *
     * @param {string} instanceId - the instance id to register
     * @returns {boolean} - has the app being registered successfully
     */
    registerInstance(instanceId) {
      this.instanceId = instanceId;
      const cookieName = CONFIG.COOKIE_NAME;
      if (!!Cookies.get(cookieName)) {
        return false;
      }
      Cookies.set(cookieName, {appInstanceId: this.instanceId});
      return true;
    }

    /**
     * Removes the cookie that keeps track of the running instance.
     *
     * @param {boolean} forceRemoval - do not check that the instance removing it is the current instance
     * @returns {void} - returns nothing
     */
    deregisterInstance(forceRemoval = false) {
      const singleInstanceCookie = Cookies.getJSON(CONFIG.COOKIE_NAME);

      const isOwnInstanceId = singleInstanceCookie && singleInstanceCookie.appInstanceId === this.instanceId;
      if (forceRemoval || isOwnInstanceId) {
        Cookies.remove(CONFIG.COOKIE_NAME);
      }
    }

    /**
     * Adds a listener that will be called whenever another instance boots.
     *
     * @param {Function} listener - a listener to be executed
     * @returns {void} - returns nothing
     */
    addExtraInstanceStartedListener(listener) {
      instanceListeners.push(listener);
      if (instanceListeners.length === 1) {
        this._startSingleInstanceCheck();
      }
    }

    /**
     * Removes a listener that would have been called whenever another instance boots.
     *
     * @param {Function} listener - a listener to be removed
     * @returns {void} - returns nothing
     */
    removeExtraInstanceStartedListener(listener) {
      const index = instanceListeners.indexOf(listener);
      instanceListeners.splice(index, 1);
      if (instanceListeners.length === 0) {
        this._stopSingleInstanceCheck();
      }
    }

    /**
     * Returns true if another instance is running.
     * Does not check for the id of the running instance and thus cannot be
     * invoked once the registering of the current instance has been done.
     *
     * @param {Function} listener - a listener to be removed
     * @throws {Error} if the current app has already been registered
     * @returns {void} - returns nothing
     */
    hasOtherRunningInstance() {
      if (this.instanceId) {
        throw new Error('Current instance has been registered, cannot check other running instances');
      }

      return !!Cookies.get(CONFIG.COOKIE_NAME);
    }

    _isSingleRunningInstance() {
      if (z.util.Environment.electron) {
        return true;
      }
      const singleInstanceCookie = Cookies.getJSON(CONFIG.COOKIE_NAME);

      return singleInstanceCookie && singleInstanceCookie.appInstanceId === this.instanceId;
    }

    _checkSingleInstance() {
      if (!this._isSingleRunningInstance()) {
        // warn listeners if the app has started in another instance
        instanceListeners.forEach(listener => listener());
      }
    }

    _startSingleInstanceCheck() {
      this._stopSingleInstanceCheck();
      checkIntervalId = window.setInterval(this._checkSingleInstance.bind(this), CONFIG.INTERVAL);
    }

    _stopSingleInstanceCheck() {
      if (checkIntervalId) {
        window.clearInterval(checkIntervalId);
      }
      checkIntervalId = undefined;
    }
  };
})();
