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

import {useEffect, useRef, useState} from 'react';

import Cookies from 'js-cookie';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {createUuid} from 'Util/uuid';

import {Runtime} from '@wireapp/commons';

const CONFIG = {
  COOKIE_NAME: 'app_opened',
  INTERVAL: TIME_IN_MILLIS.SECOND,
};

function isRunningInstance(instanceId?: string) {
  if (Runtime.isDesktopApp()) {
    return true;
  }
  const cookieValue = Cookies.get(CONFIG.COOKIE_NAME);
  const otherInstanceId = cookieValue ? JSON.parse(cookieValue).appInstanceId : cookieValue;
  return otherInstanceId === instanceId;
}

function poll(instanceIdRef: {current: string | undefined}, onNewInstance: () => void) {
  const checkSingleInstance = (): void => {
    if (!isRunningInstance(instanceIdRef.current)) {
      onNewInstance();
    }
  };
  const interval = window.setInterval(checkSingleInstance, CONFIG.INTERVAL);
  return () => window.clearInterval(interval);
}

function killCurrentInstance() {
  return Cookies.remove(CONFIG.COOKIE_NAME);
}

function register(instanceId: string) {
  Cookies.set(CONFIG.COOKIE_NAME, JSON.stringify({appInstanceId: instanceId}), {sameSite: 'Lax'});
  return () => killCurrentInstance();
}

export function useSingleInstance() {
  const instanceId = useRef<string | undefined>(undefined);
  const [hasOtherInstance, setHasOtherInstance] = useState(!isRunningInstance(instanceId.current));

  const registerInstance = () => {
    instanceId.current = createUuid();
    return register(instanceId.current);
  };

  const killRunningInstance = () => {
    killCurrentInstance();
    setHasOtherInstance(false);
  };

  useEffect(() => poll(instanceId, () => setHasOtherInstance(true)));

  return {hasOtherInstance, killRunningInstance, registerInstance};
}
