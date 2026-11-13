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

import {MlsError_Tags} from '@wireapp/core-crypto';

/**
 * Thrown when CoreCrypto has been buffering incoming messages of an MLS group for longer than the
 * recovery threshold (see BufferedMlsMessageRecoveryTracker). The caller is expected to verify the
 * group epoch against the backend and rejoin if needed.
 */
export class MlsBufferedMessageRecoveryRequiredError extends Error {
  constructor(
    readonly groupId: string,
    readonly bufferedErrorType: MlsError_Tags.BufferedFutureMessage | MlsError_Tags.BufferedCommit,
    bufferedMessageError: unknown,
  ) {
    super('MLS messages have been buffered for too long, stale epoch recovery is required', {
      cause: bufferedMessageError,
    });
    this.name = 'MlsBufferedMessageRecoveryRequiredError';
  }
}
