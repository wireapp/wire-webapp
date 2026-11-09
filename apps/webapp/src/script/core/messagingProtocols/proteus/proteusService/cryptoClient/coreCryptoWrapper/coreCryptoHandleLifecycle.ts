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

import {result, type Result} from 'true-myth';

type CoreCryptoHandle = {
  uniffiDestroy: () => void;
};

export type CoreCryptoHandles = {
  database?: CoreCryptoHandle;
  instance?: CoreCryptoHandle;
  pkiEnvironment?: CoreCryptoHandle;
};

/**
 * Release handles in dependency order. Every destroy is attempted before the
 * results are combined, so one failing handle cannot keep the database locked.
 */
export const releaseCoreCryptoHandles = ({
  database,
  instance,
  pkiEnvironment,
}: CoreCryptoHandles): Result<void, Error> => {
  const pkiEnvironmentDestroyResult = result.tryOrElse(
    cause => {
      return new Error('Failed to destroy the CoreCrypto PKI environment', {cause});
    },
    () => {
      pkiEnvironment?.uniffiDestroy();
    },
  );
  const instanceDestroyResult = result.tryOrElse(
    cause => {
      return new Error('Failed to destroy the CoreCrypto instance', {cause});
    },
    () => {
      instance?.uniffiDestroy();
    },
  );
  const databaseDestroyResult = result.tryOrElse(
    cause => {
      return new Error('Failed to destroy the CoreCrypto database', {cause});
    },
    () => {
      database?.uniffiDestroy();
    },
  );

  return pkiEnvironmentDestroyResult.and(instanceDestroyResult).and(databaseDestroyResult);
};
