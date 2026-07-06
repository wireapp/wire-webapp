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

import is from '@sindresorhus/is';
import {Runtime} from '@wireapp/commons';
import {Maybe, result} from 'true-myth';

import {BrowserStorage, createBrowserStorage} from 'src/script/browser/storage/browserStorage';
import {getStorage} from 'Util/localStorage';
import {TIME_IN_MILLIS} from 'Util/timeUtil';
import {createUuid} from 'Util/uuid';

const CONFIG = {
  INTERVAL: TIME_IN_MILLIS.SECOND,
  STORAGE_KEY: 'app_opened',
};

const browserStorage = createBrowserStorage(Maybe.of(getStorage()));

function getStoredInstanceId(storage: BrowserStorage): Maybe<string> {
  const storedInstance = storage.getItem(CONFIG.STORAGE_KEY);

  return storedInstance.match({
    Just: storedInstanceValue => {
      const parsedInstanceResult = result.tryOrElse(
        error => {
          return error instanceof Error ? error : new Error('Failed to parse stored single-instance marker');
        },
        () => {
          return JSON.parse(storedInstanceValue) as unknown;
        },
      );

      if (result.isErr(parsedInstanceResult)) {
        storage.removeItem(CONFIG.STORAGE_KEY);
        return Maybe.nothing();
      }

      const parsedInstance = parsedInstanceResult.value;

      if (is.object(parsedInstance) && 'appInstanceId' in parsedInstance && is.string(parsedInstance.appInstanceId)) {
        return Maybe.just(parsedInstance.appInstanceId);
      }

      storage.removeItem(CONFIG.STORAGE_KEY);
      return Maybe.nothing();
    },
    Nothing: () => {
      return Maybe.nothing();
    },
  });
}

function isRunningInstance(instanceId: Maybe<string>) {
  if (Runtime.isDesktopApp()) {
    return true;
  }

  const otherInstanceId = getStoredInstanceId(browserStorage);
  return otherInstanceId.equals(instanceId);
}

function poll(instanceIdRef: {current: Maybe<string>}, onNewInstance: () => void) {
  const checkSingleInstance = (): void => {
    if (!isRunningInstance(instanceIdRef.current)) {
      onNewInstance();
    }
  };
  const interval = window.setInterval(checkSingleInstance, CONFIG.INTERVAL);
  return () => {
    return window.clearInterval(interval);
  };
}

function killCurrentInstance() {
  browserStorage.removeItem(CONFIG.STORAGE_KEY);
}

function register(instanceId: string) {
  browserStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({appInstanceId: instanceId}));
  return () => {
    return killCurrentInstance();
  };
}

export function useSingleInstance() {
  const instanceId = useRef<Maybe<string>>(Maybe.nothing());
  const [hasOtherInstance, setHasOtherInstance] = useState(!isRunningInstance(instanceId.current));

  const registerInstance = () => {
    const nextInstanceId = createUuid();
    instanceId.current = Maybe.just(nextInstanceId);
    return register(nextInstanceId);
  };

  const killRunningInstance = () => {
    killCurrentInstance();
    setHasOtherInstance(false);
  };

  useEffect(() => {
    return poll(instanceId, () => {
      return setHasOtherInstance(true);
    });
  });

  return {hasOtherInstance, killRunningInstance, registerInstance};
}
