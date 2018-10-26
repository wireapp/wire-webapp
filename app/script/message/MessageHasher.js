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
   * @param {number[]} array - The bytes to hash
   * @returns {Promise<Uint8Array>} Promise with hashed string bytes
   */
  const _createSha256Hash = array => {
    const buffer = new Uint8Array(array).buffer;
    return crypto.subtle.digest('SHA-256', buffer).then(hash => new Uint8Array(hash));
  };

  /**
   * @param {Asset} asset - The file or image asset
   * @returns {number[]} Array of assetId bytes
   */
  const _getAssetIdArray = asset => {
    const assetId = asset.original_resource().identifier;
    const withoutDashes = assetId.replace(/-/g, '');
    return z.util.StringUtil.hexToBytes(withoutDashes);
  };

  /**
   * @param {Asset} asset - The location asset
   * @returns {number[]} Array of longitude bytes
   */
  const _getLocationArray = asset => {
    const latitudeApproximate = Math.round(asset.latitude * 1000);
    const longitudeApproximate = Math.round(asset.longitude * 1000);

    const latitudeLong = Long.fromInt(latitudeApproximate).toBytesBE();
    const longitudeLong = Long.fromInt(longitudeApproximate).toBytesBE();

    return latitudeLong.concat(longitudeLong);
  };

  /**
   * @param {textEntity} textEntity - The text entity to convert
   * @returns {number[]} Array of string bytes
   */
  const _getTextArray = textEntity => z.util.StringUtil.utf8ToUtf16BE(textEntity.text);

  /**
   * @param {number} timestamp - The timestamp to convert
   * @returns {number[]} the timestamp as long endian bytes
   */
  const _getTimestampArray = timestamp => Long.fromInt(timestamp).toBytesBE();

  return {
    /**
     * @param {LocationMessage} messageEntity - The message to hash
     * @returns {Promise<Uint8Array>} Promise with hashed location message
     */
    getAssetMessageHash: messageEntity => {
      const fileAsset = messageEntity.get_first_asset();

      const locationArray = _getAssetIdArray(fileAsset);
      const timestampArray = _getTimestampArray(messageEntity.timestamp());
      const concatenatedArray = locationArray.concat(timestampArray);

      return _createSha256Hash(concatenatedArray);
    },

    /**
     * @param {LocationMessage} messageEntity - The message to hash
     * @returns {Promise<Uint8Array>} Promise with hashed location message
     */
    getLocationMessageHash: messageEntity => {
      const locationAsset = messageEntity.get_first_asset();

      const locationArray = _getLocationArray(locationAsset);
      const timestampArray = _getTimestampArray(messageEntity.timestamp());
      const concatenatedArray = locationArray.concat(timestampArray);

      return _createSha256Hash(concatenatedArray);
    },

    /**
     * @param {ContentMessage} messageEntity - The message to hash
     * @returns {Promise<Uint8Array>} Promise with hashed text message
     */
    getTextMessageHash: messageEntity => {
      const textAsset = messageEntity.get_first_asset();

      const textArray = _getTextArray(textAsset);
      const timestampArray = _getTimestampArray(messageEntity.timestamp());
      const concatenatedArray = textArray.concat(timestampArray);

      return _createSha256Hash(concatenatedArray);
    },
  };
})();
