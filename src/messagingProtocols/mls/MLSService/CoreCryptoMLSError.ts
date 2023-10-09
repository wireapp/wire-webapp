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

export const CoreCryptoMLSError = {
  DECRYPTION: {
    WRONG_EPOCH: 'Incoming message is for the wrong epoch',
    ALREADY_DECRYPTED: 'We already decrypted this message once',
    EXTERNAL_COMMIT_NOT_MERGED:
      'You tried to join with an external commit but did not merge it yet. We will reapply this message for you when you merge your external commit',
    FUTURE_EPOCH: 'Incoming message is for a future epoch. We will buffer it until the commit for that epoch arrives',
  },
  CONVERSATION_ALREADY_EXISTS: 'Conversation already exists',
} as const;

export const isCoreCryptoMLSWrongEpochError = (error: unknown): boolean => {
  return error instanceof Error && error.message === CoreCryptoMLSError.DECRYPTION.WRONG_EPOCH;
};

export const isCoreCryptoMLSConversationAlreadyExistsError = (error: unknown): boolean => {
  return error instanceof Error && error.message === CoreCryptoMLSError.CONVERSATION_ALREADY_EXISTS;
};

const mlsDecryptionErrorsToIgnore: string[] = [
  CoreCryptoMLSError.DECRYPTION.ALREADY_DECRYPTED,
  CoreCryptoMLSError.DECRYPTION.EXTERNAL_COMMIT_NOT_MERGED,
  CoreCryptoMLSError.DECRYPTION.FUTURE_EPOCH,
];

export const shouldMLSDecryptionErrorBeIgnored = (error: unknown): error is Error => {
  return error instanceof Error && mlsDecryptionErrorsToIgnore.includes(error.message);
};
