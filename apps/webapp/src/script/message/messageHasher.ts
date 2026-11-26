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

import {hashEvent} from './hashEvent';

import {LegacyEventRecord} from '../repositories/storage/record/eventRecord';

/**
 * Validates that the quoteHash correspond to the given event.
 *
 * @returns `true` if the event hash is equal to the given hash
 */
const validateHash = async (event: LegacyEventRecord, hash: ArrayBuffer): Promise<boolean> => {
  const generatedHash = await hashEvent(event);
  if (hash.byteLength !== generatedHash.byteLength) {
    return false;
  }
  const generatedHashBytes = new Uint8Array(generatedHash);
  const hashBytes = new Uint8Array(hash);
  for (let byteIndex = 0; byteIndex !== generatedHash.byteLength; byteIndex++) {
    if (generatedHashBytes[byteIndex] !== hashBytes[byteIndex]) {
      return false;
    }
  }
  return true;
};

export const MessageHasher = {
  hashEvent,
  validateHash,
};
