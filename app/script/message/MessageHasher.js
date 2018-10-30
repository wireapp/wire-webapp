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
   * @param {Event} event - The event
   * @returns {number[]} the timestamp as long endian bytes
   * @private
   */
  const getTimestampBytes = event => Long.fromInt(new Date(event.time).getTime()).toBytesBE();

  const getTextBytes = event => {
    return z.util.StringUtil.utf8ToUtf16BE(event.data.content);
  };

  function hashEvent(event) {
    const EventTypes = z.event.Client.CONVERSATION;
    let specificBytes;
    switch (event.type) {
      case EventTypes.MESSAGE_ADD:
        specificBytes = getTextBytes(event);
        break;
      case EventTypes.LOCATION:
        specificBytes = getLocationBytes(event);
        break;
      case EventTypes.ASSET_ADD:
        specificBytes = getAssetBytes(event);
        break;
      default:
        throw new Error('TODO');
    }

    return createSha256Hash(specificBytes.concat(getTimestampBytes(event)));
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
