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
    return crypto.subtle.digest('SHA-256', buffer).then(hash => new Uint8Array(hash));
  };

  /**
   * @param {z.entity.File} asset - The file asset
   * @returns {number[]} Array of assetId bytes
   * @private
   */
  const getFileAssetBytes = asset => {
    const assetId = asset.original_resource().identifier;
    const withoutDashes = assetId.replace(/-/g, '');
    return z.util.StringUtil.hexToBytes(withoutDashes);
  };

  /**
   * @param {z.entity.MediumImage} asset - The image asset
   * @returns {number[]} Array of assetId bytes
   * @private
   */
  const getImageAssetBytes = asset => {
    const assetId = asset.resource().identifier;
    const withoutDashes = assetId.replace(/-/g, '');
    return z.util.StringUtil.hexToBytes(withoutDashes);
  };

  /**
   * @param {Asset} asset - The location asset
   * @returns {number[]} Array of longitude bytes
   * @private
   */
  const getLocationBytes = asset => {
    const latitudeApproximate = Math.round(asset.latitude * 1000);
    const longitudeApproximate = Math.round(asset.longitude * 1000);

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

  return {
    /**
     * @param {ContentMessage} messageEntity - The message to hash
     * @returns {Promise<Uint8Array>} Promise with hashed file message
     */
    getFileMessageHash: messageEntity => {
      const fileAsset = messageEntity.get_first_asset();

      const fileAssetBytes = getFileAssetBytes(fileAsset);
      const timestampBytes = getTimestampBytes(messageEntity.timestamp());
      const concatenatedBytes = fileAssetBytes.concat(timestampBytes);

      return createSha256Hash(concatenatedBytes);
    },

    /**
     * @param {ContentMessage} messageEntity - The message to hash
     * @returns {Promise<Uint8Array>} Promise with hashed image message
     */
    getImageMessageHash: messageEntity => {
      const fileAsset = messageEntity.get_first_asset();

      const imageAssetBytes = getImageAssetBytes(fileAsset);
      const timestampBytes = getTimestampBytes(messageEntity.timestamp());
      const concatenatedBytes = imageAssetBytes.concat(timestampBytes);

      return createSha256Hash(concatenatedBytes);
    },

    /**
     * @param {ContentMessage} messageEntity - The message to hash
     * @returns {Promise<Uint8Array>} Promise with hashed location message
     */
    getLocationMessageHash: messageEntity => {
      const locationAsset = messageEntity.get_first_asset();

      const locationBytes = getLocationBytes(locationAsset);
      const timestampBytes = getTimestampBytes(messageEntity.timestamp());
      const concatenatedBytes = locationBytes.concat(timestampBytes);

      return createSha256Hash(concatenatedBytes);
    },

    /**
     * @param {ContentMessage} messageEntity - The message to hash
     * @returns {Promise<Uint8Array>} Promise with hashed text message
     */
    getTextMessageHash: messageEntity => {
      const textAsset = messageEntity.get_first_asset();

      const textBytes = z.util.StringUtil.utf8ToUtf16BE(textAsset.text);
      const timestampBytes = getTimestampBytes(messageEntity.timestamp());
      const concatenatedBytes = textBytes.concat(timestampBytes);

      return createSha256Hash(concatenatedBytes);
    },
  };
})();
