/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {ConversationOtrMessageAddEvent} from '@wireapp/api-client/lib/event';
import logdown from 'logdown';

import {errors as ProteusErrors} from '@wireapp/proteus';

import {DecryptionError} from '../../errors/DecryptionError';

type ErrorWithCode = Error & {code?: number};
const hasErrorCode = (error: any): ErrorWithCode => error && error.code;

const generateDecryptionError = (
  event: ConversationOtrMessageAddEvent,
  error: any,
  logger: logdown.Logger,
): DecryptionError => {
  const errorCode = hasErrorCode(error) ? error.code ?? 999 : 999;
  let message = 'Unknown decryption error';

  const {data: eventData, from: remoteUserId, time: formattedTime} = event;
  const remoteClientId = eventData.sender;

  const isDuplicateMessage = error instanceof ProteusErrors.DecryptError.DuplicateMessage;
  const isOutdatedMessage = error instanceof ProteusErrors.DecryptError.OutdatedMessage;
  // We don't need to show these message errors to the user
  if (isDuplicateMessage || isOutdatedMessage) {
    message = `Message from user ID "${remoteUserId}" at "${formattedTime}" will not be handled because it is outdated or a duplicate.`;
  }

  const isInvalidMessage = error instanceof ProteusErrors.DecryptError.InvalidMessage;
  const isInvalidSignature = error instanceof ProteusErrors.DecryptError.InvalidSignature;
  const isRemoteIdentityChanged = error instanceof ProteusErrors.DecryptError.RemoteIdentityChanged;
  // Session is broken, let's see what's really causing it...
  if (isInvalidMessage || isInvalidSignature) {
    message = `Session with user '${remoteUserId}' (${remoteClientId}) is broken.\nReset the session for possible fix.`;
  } else if (isRemoteIdentityChanged) {
    message = `Remote identity of client '${remoteClientId}' from user '${remoteUserId}' changed`;
  }

  logger.warn(
    `Failed to decrypt event from client '${remoteClientId}' of user '${remoteUserId}' (${formattedTime}).\nError Code: '${errorCode}'\nError Message: ${error.message}`,
    error,
  );
  return new DecryptionError(message, errorCode);
};

export {generateDecryptionError};
