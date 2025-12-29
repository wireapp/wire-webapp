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

import Long from 'long';

import {ClientEvent} from 'Repositories/event/Client';
import {LegacyEventRecord} from 'Repositories/storage/record/EventRecord';
import {utf8ToUtf16BE} from 'Util/StringUtil';

/**
 * @returns Promise with hashed string bytes
 */
const createSha256Hash = async (bytes: number[]): Promise<ArrayBuffer> => {
  const buffer = new Uint8Array(bytes);
  return window.crypto.subtle.digest('SHA-256', buffer);
};

/**
 * @returns Array of assetId bytes
 */
const getAssetBytes = (event: any): number[] => utf8ToUtf16BE(event.data.key);

/**
 * @returns Array of longitude bytes
 */
const getLocationBytes = (event: any): number[] => {
  const {longitude, latitude} = event.data.location;
  const latitudeApproximate = Math.round(latitude * 1000);
  const longitudeApproximate = Math.round(longitude * 1000);

  const latitudeLong = Long.fromInt(latitudeApproximate).toBytesBE();
  const longitudeLong = Long.fromInt(longitudeApproximate).toBytesBE();

  return latitudeLong.concat(longitudeLong);
};

/**
 * @returns the timestamp as long endian bytes
 */
const getTimestampBytes = (event: any): number[] => {
  const unixTimestamp = new Date(event.time).getTime();
  const timestampSeconds = Math.floor(unixTimestamp / 1e3);
  return Long.fromInt(timestampSeconds).toBytesBE();
};

const getTextBytes = (event: any): number[] => utf8ToUtf16BE(event.data.content);

const getMultipartTextBytes = (event: any): number[] => utf8ToUtf16BE(event.data.text.content);

/**
 * Creates a hash of the given event.
 *
 * @returns buffer containing the bytes of the hash
 */
const hashEvent = (event: any): Promise<ArrayBuffer> => {
  let specificBytes: number[];

  switch (event.type) {
    case ClientEvent.CONVERSATION.MESSAGE_ADD: {
      specificBytes = getTextBytes(event);
      break;
    }
    case ClientEvent.CONVERSATION.MULTIPART_MESSAGE_ADD: {
      specificBytes = getMultipartTextBytes(event);
      break;
    }
    case ClientEvent.CONVERSATION.LOCATION: {
      specificBytes = getLocationBytes(event);
      break;
    }
    case ClientEvent.CONVERSATION.ASSET_ADD: {
      specificBytes = getAssetBytes(event);
      break;
    }
    default: {
      throw new Error(`Cannot generate hash for event of type "${event.type}"`);
    }
  }

  const timeBytes = getTimestampBytes(event);
  const allBytes = specificBytes.concat(timeBytes);

  return createSha256Hash(allBytes);
};

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
  for (let i = 0; i !== generatedHash.byteLength; i++) {
    if (generatedHashBytes[i] !== hashBytes[i]) {
      return false;
    }
  }
  return true;
};

export const MessageHasher = {
  hashEvent,
  validateHash,
};
