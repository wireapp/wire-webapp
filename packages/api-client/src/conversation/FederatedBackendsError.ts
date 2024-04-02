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
  NON_FEDERATING_BACKENDS = 'NonFederatingBackendsError',
}

enum FederatedBackendsErrorCode {
  NON_FEDERATING = 409, // When 2 users' backend are not connected to each others
  UNREACHABLE = 533, // When a backend is not reachable for the current user
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

    case FederatedBackendsErrorCode.NON_FEDERATING: {
      throw new FederatedBackendsError(
        FederatedBackendsErrorLabel.NON_FEDERATING_BACKENDS,
        error.response.data.non_federating_backends,
      );
    }
  }
}
