/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {Maybe, result} from 'true-myth';

import {StringKeyValueStorage} from 'src/script/storage/stringKeyValueStorageTypes';

export function createStringKeyValueStorageFromWebStorage(webStorage: Maybe<Storage>): StringKeyValueStorage {
  return {
    getItem: key => {
      return webStorage.andThen(storage => {
        const storedValue = result.tryOrElse(
          error => {
            return error;
          },
          () => {
            return storage.getItem(key);
          },
        );

        if (result.isErr(storedValue)) {
          return Maybe.nothing();
        }

        return Maybe.of(storedValue.value);
      });
    },
    removeItem: key => {
      return webStorage.inspect(storage => {
        result.tryOrElse(
          error => {
            return error;
          },
          () => {
            return storage.removeItem(key);
          },
        );
      });
    },
    setItem: (key, value) => {
      return webStorage.inspect(storage => {
        result.tryOrElse(
          error => {
            return error;
          },
          () => {
            return storage.setItem(key, value);
          },
        );
      });
    },
  };
}
