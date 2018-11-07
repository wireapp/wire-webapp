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

'use strict';

const Long = window.dcodeIO.Long;
const crypto = window.crypto;

window.z = window.z || {};
window.z.message = z.message || {};

z.message.MessageHasher = (() => {
  /**
   * @param {number[]} bytes - The array of bytes to hash
   * @returns {Promise<ArrayBuffer>} Promise with hashed string bytes
   * @private
   */
  const createSha256Hash = bytes => {
    const buffer = new Uint8Array(bytes).buffer;
    return crypto.subtle.digest('SHA-256', buffer);
  };

  /**
   * @param {Event} event - The event
   * @returns {number[]} Array of assetId bytes
   * @private
   */
  const getAssetBytes = event => z.util.StringUtil.utf8ToUtf16BE(event.data.key);

  /**
   * @param {Event} event - The event
   * @returns {number[]} Array of longitude bytes
   * @private
   */
  const getLocationBytes = event => {
    const {longitude, latitude} = event.data.location;
    const latitudeApproximate = Math.round(latitude * 1000);
    const longitudeApproximate = Math.round(longitude * 1000);

    const latitudeLong = Long.fromInt(latitudeApproximate).toBytesBE();
    const longitudeLong = Long.fromInt(longitudeApproximate).toBytesBE();

    return latitudeLong.concat(longitudeLong);
  };

  /**
   * @param {Event} event - The event
   * @returns {number[]} the timestamp as long endian bytes
   * @private
   */
  const getTimestampBytes = event => {
    const unixTimestamp = new Date(event.time).getTime();
    const timestampSeconds = Math.floor(unixTimestamp / 1e3);
    return Long.fromInt(timestampSeconds).toBytesBE();
  };

  const getTextBytes = event => z.util.StringUtil.utf8ToUtf16BE(event.data.content);

  /**
   * Creates a hash of the given event.
   *
   * @param {Event} event - the event to hash
   * @returns {ArrayBuffer} hashBuffer - buffer containing the bytes of the hash
   */
  const hashEvent = event => {
    const EventTypes = z.event.Client.CONVERSATION;
    const specificBytesGenerators = {
      [EventTypes.MESSAGE_ADD]: getTextBytes,
      [EventTypes.LOCATION]: getLocationBytes,
      [EventTypes.ASSET_ADD]: getAssetBytes,
    };

    const generator = specificBytesGenerators[event.type];
    if (!generator) {
      throw new Error(`Cannot generate hash for event of type "${event.type}"`);
    }

    const specificBytes = generator(event);
    const timeBytes = getTimestampBytes(event);
    const allBytes = specificBytes.concat(timeBytes);

    return createSha256Hash(allBytes);
  };

  /**
   * Validates that the quoteHash correspond to the given event.
   *
   * @param {Event} event - The event to match against the hash
   * @param {ArrayBuffer} hash - The hash
   * @returns {boolean} isValid - true if the event hash is equal to the given hash
   */
  const validateHash = (event, hash) => {
    return hashEvent(event).then(generatedHash => {
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
    });
  };

  return {
    hashEvent,
    validateHash,
  };
})();
