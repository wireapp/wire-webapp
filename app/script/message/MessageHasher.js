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
   * @returns {Promise<Uint8Array>} Promise with hashed string bytes
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
  const getAssetBytes = event => {
    const assetId = event.data.key;
    return z.util.StringUtil.utf8ToUtf16BE(assetId);
  };

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
   * @param {number} timestamp - The timestamp to convert
   * @returns {number[]} the timestamp as long endian bytes
   * @private
   */
  const getTimestampBytes = timestamp => Long.fromInt(timestamp).toBytesBE();

  /**
   * @param {ContentMessage} event - The message to hash
   * @returns {Promise<Uint8Array>} Promise with hashed image message
   */
  function hashAssetEvent(event) {
    const imageAssetBytes = getAssetBytes(event);
    const timestampBytes = getTimestampBytes(new Date(event.time).getTime());
    const concatenatedBytes = imageAssetBytes.concat(timestampBytes);

    return createSha256Hash(concatenatedBytes);
  }

  /**
   * @param {Event} event - The message to hash
   * @returns {Promise<Uint8Array>} Promise with hashed location message
   */
  function hashLocationEvent(event) {
    const locationBytes = getLocationBytes(event);
    const timestampBytes = getTimestampBytes(new Date(event.time).getTime());
    const concatenatedBytes = locationBytes.concat(timestampBytes);

    return createSha256Hash(concatenatedBytes);
  }

  /**
   * @param {ContentMessage} event - The message to hash
   * @returns {Promise<Uint8Array>} Promise with hashed text message
   */
  function hashTextEvent(event) {
    const textBytes = z.util.StringUtil.utf8ToUtf16BE(event.data.content);
    const timestampBytes = getTimestampBytes(new Date(event.time).getTime());
    const concatenatedBytes = textBytes.concat(timestampBytes);

    return createSha256Hash(concatenatedBytes);
  }

  function hashEvent(event) {
    const EventTypes = z.event.Client.CONVERSATION;
    let hashFunction;
    switch (event.type) {
      case EventTypes.MESSAGE_ADD:
        hashFunction = hashTextEvent;
        break;
      case EventTypes.LOCATION:
        hashFunction = hashLocationEvent;
        break;
      case EventTypes.ASSET_ADD:
        hashFunction = hashAssetEvent;
        break;
      default:
        throw new Error('TODO');
    }

    return hashFunction(event);
  }

  return {
    hashEvent,
    validateHash(event, hashBuffer) {
      return hashEvent(event).then(eventHashBuffer => {
        if (hashBuffer.byteLength !== eventHashBuffer.byteLength) {
          return false;
        }
        const dv1 = new Uint8Array(eventHashBuffer);
        const dv2 = new Uint8Array(hashBuffer);
        for (let i = 0; i !== eventHashBuffer.byteLength; i++) {
          if (dv1[i] !== dv2[i]) {
            return false;
          }
        }
        return true;
      });
    },
  };
})();
