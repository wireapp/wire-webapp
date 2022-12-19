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

import {useEffect, useState} from 'react';

import Cookies from 'js-cookie';

import {Runtime} from '@wireapp/commons';

import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {createRandomUuid} from 'Util/util';

const CONFIG = {
  COOKIE_NAME: 'app_opened',
  INTERVAL: TIME_IN_MILLIS.SECOND,
};

/**
 * Class responsible for checking that only the current instance of the app is running.
 */
export class SingleInstanceHandler {
  instanceId?: string = undefined;

  poll(onNewInstance: () => void) {
    const checkSingleInstance = (): void => {
      if (!this.isRunningInstance()) {
        onNewInstance();
      }
    };
    const interval = window.setInterval(checkSingleInstance, CONFIG.INTERVAL);
    return () => window.clearInterval(interval);
  }

  /**
   * Set the cookie to verify we are running a single instance tab.
   * Returns `true` if the instance has been registered successfully.
   * Returns `false` if the app is already running in another instance.
   *
   * Side effects: will also start the interval check if a callback was provided in the constructor
   *
   * @returns Was the app registered successfully.
   */
  registerInstance() {
    this.instanceId = createRandomUuid();
    const cookieName = CONFIG.COOKIE_NAME;
    if (!!Cookies.get(cookieName)) {
      return false;
    }
    Cookies.set(cookieName, this.instanceId, {sameSite: 'Lax'});
    return true;
  }

  deregisterLocalInstance() {
    if (this.isRunningInstance()) {
      this.deregisterCurrentInstance();
    }
  }

  deregisterCurrentInstance() {
    return Cookies.remove(CONFIG.COOKIE_NAME);
  }

  isRunningInstance() {
    if (Runtime.isDesktopApp()) {
      return true;
    }
    const cookieValue = Cookies.get(CONFIG.COOKIE_NAME);
    return this.instanceId === cookieValue;
  }
}

const singleInstance = new SingleInstanceHandler();

export function useSingleInstance() {
  const [hasOtherInstance, setHasOtherInstance] = useState(!singleInstance.isRunningInstance());

  const registerInstance = () => singleInstance.registerInstance();

  const killRunningInstance = () => {
    singleInstance.deregisterCurrentInstance();
    setHasOtherInstance(false);
  };

  useEffect(() => {
    const stopPolling = singleInstance.poll(() => setHasOtherInstance(true));
    return stopPolling;
  });

  return {hasOtherInstance, killRunningInstance, registerInstance};
}
