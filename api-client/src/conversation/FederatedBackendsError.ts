/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {AxiosError} from 'axios';

export enum FederatedBackendsErrorLabel {
  UNREACHABLE_BACKENDS = 'UnreachableBackendsError',
  NOT_CONNECTED_BACKENDS = 'NotConnectedBackendsError',
}

enum FederatedBackendsErrorCode {
  UNREACHABLE = 533,
}

export class FederatedBackendsError extends Error {
  constructor(
    public readonly label: FederatedBackendsErrorLabel,
    public readonly backends: string[],
  ) {
    super('federatedBackendsError');
    this.name = 'FederatedBackendsError';
  }
}

export function isFederatedBackendsError(error: unknown): error is FederatedBackendsError {
  return !!error && typeof error === 'object' && 'name' in error && error.name === 'FederatedBackendsError';
}

export function handleFederationErrors(error: AxiosError<any>) {
  switch (error.response?.status) {
    case FederatedBackendsErrorCode.UNREACHABLE: {
      throw new FederatedBackendsError(
        FederatedBackendsErrorLabel.UNREACHABLE_BACKENDS,
        error.response.data.unreachable_backends,
      );
    }
  }
}
