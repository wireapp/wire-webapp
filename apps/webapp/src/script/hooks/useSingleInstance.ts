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

import {createStringKeyValueStorageFromWebStorage} from 'src/script/browser/storage/createStringKeyValueStorageFromWebStorage';
import {StringKeyValueStorage} from 'src/script/storage/StringKeyValueStorage';
import {getStorage} from 'Util/localStorage';
import {TIME_IN_MILLIS} from 'Util/timeUtil';
import {createUuid} from 'Util/uuid';

const CONFIG = {
  INTERVAL: TIME_IN_MILLIS.SECOND,
  STORAGE_KEY: 'app_opened',
};

interface UseSingleInstanceDependencies {
  singleInstanceStorage: StringKeyValueStorage;
}

interface UseSingleInstanceResult {
  hasOtherInstance: boolean;
  killRunningInstance: () => void;
  registerInstance: () => () => void;
}

const defaultUseSingleInstanceDependencies: UseSingleInstanceDependencies = {
  singleInstanceStorage: createStringKeyValueStorageFromWebStorage(Maybe.of(getStorage())),
};

function getStoredInstanceId(storage: StringKeyValueStorage): Maybe<string> {
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

function isRunningInstance(instanceId: Maybe<string>, storage: StringKeyValueStorage): boolean {
  if (Runtime.isDesktopApp()) {
    return true;
  }

  const otherInstanceId = getStoredInstanceId(storage);
  return otherInstanceId.equals(instanceId);
}

function startSingleInstancePolling(
  getCurrentInstanceId: () => Maybe<string>,
  onNewInstance: () => void,
  storage: StringKeyValueStorage,
): () => void {
  const checkSingleInstance = (): void => {
    if (!isRunningInstance(getCurrentInstanceId(), storage)) {
      onNewInstance();
    }
  };
  const interval = window.setInterval(checkSingleInstance, CONFIG.INTERVAL);
  return () => {
    return window.clearInterval(interval);
  };
}

function killCurrentInstance(storage: StringKeyValueStorage): void {
  storage.removeItem(CONFIG.STORAGE_KEY);
}

function register(instanceId: string, storage: StringKeyValueStorage): () => void {
  storage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({appInstanceId: instanceId}));
  return () => {
    return killCurrentInstance(storage);
  };
}

export function createUseSingleInstance(dependencies: UseSingleInstanceDependencies): () => UseSingleInstanceResult {
  const {singleInstanceStorage} = dependencies;

  return function useSingleInstanceWithDependencies(): UseSingleInstanceResult {
    const instanceId = useRef<Maybe<string>>(Maybe.nothing());
    const [hasOtherInstance, setHasOtherInstance] = useState(
      !isRunningInstance(instanceId.current, singleInstanceStorage),
    );

    const registerInstance = (): (() => void) => {
      const nextInstanceId = createUuid();
      instanceId.current = Maybe.just(nextInstanceId);
      return register(nextInstanceId, singleInstanceStorage);
    };

    const killRunningInstance = (): void => {
      killCurrentInstance(singleInstanceStorage);
      setHasOtherInstance(false);
    };

    useEffect(() => {
      return startSingleInstancePolling(
        () => {
          return instanceId.current;
        },
        () => {
          return setHasOtherInstance(true);
        },
        singleInstanceStorage,
      );
    });

    return {hasOtherInstance, killRunningInstance, registerInstance};
  };
}

export const useSingleInstance = createUseSingleInstance(defaultUseSingleInstanceDependencies);
