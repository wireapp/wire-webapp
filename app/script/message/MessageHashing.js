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

window.z = window.z || {};
window.z.message = z.message || {};

z.message.MessageHashing = {
  /**
   * @param {number[]} array - The bytes to hash
   * @returns {Promise<Uint8Array>} Promise with hashed string bytes
   */
  _createSha256Hash: async array => {
    const buffer = new Uint8Array(array).buffer;
    const hash = await window.crypto.subtle.digest('SHA-256', buffer);
    return new Uint8Array(hash);
  },

  /**
   * @param {Asset} asset - The file or image asset
   * @returns {number[]} Array of assetId bytes
   */
  _getAssetIdArray: asset => {
    const assetId = asset.original_resource().identifier;
    const withoutDashes = assetId.replace(/-/g, '');
    return z.util.StringUtil.hexToBytes(withoutDashes);
  },

  /**
   * @param {Asset} asset - The location asset
   * @returns {number[]} Array of longitude bytes
   */
  _getLocationArray: asset => {
    const latitudeApproximate = Math.round(asset.latitude * 1000);
    const longitudeApproximate = Math.round(asset.longitude * 1000);

    const latitudeLong = Long.fromInt(latitudeApproximate).toBytesBE();
    const longitudeLong = Long.fromInt(longitudeApproximate).toBytesBE();

    return latitudeLong.concat(longitudeLong);
  },

  /**
   * @param {textEntity} textEntity - The text entity to convert
   * @returns {number[]} Array of string bytes
   */
  _getTextArray: textEntity => {
    return z.util.StringUtil.utf8ToUtf16BE(textEntity.text);
  },

  /**
   * @param {number} timestamp - The timestamp to convert
   * @returns {number[]} the timestamp as long endian bytes
   */
  _getTimestampArray: timestamp => {
    return Long.fromInt(timestamp).toBytesBE();
  },

  /**
   * @param {LocationMessage} messageEntity - The message to hash
   * @returns {Promise<ArrayBuffer>} Promise with hashed location message as ArrayBuffer
   */
  getAssetMessageHash: messageEntity => {
    const fileAsset = messageEntity.get_first_asset();

    const locationArray = z.message.MessageHashing._getAssetIdArray(fileAsset);
    const timestampArray = z.message.MessageHashing._getTimestampArray(messageEntity.timestamp());
    const concatenatedArray = locationArray.concat(timestampArray);

    return z.message.MessageHashing._createSha256Hash(concatenatedArray);
  },

  /**
   * @param {LocationMessage} messageEntity - The message to hash
   * @returns {Promise<ArrayBuffer>} Promise with hashed location message as ArrayBuffer
   */
  getLocationMessageHash: messageEntity => {
    const locationAsset = messageEntity.get_first_asset();

    const locationArray = z.message.MessageHashing._getLocationArray(locationAsset);
    const timestampArray = z.message.MessageHashing._getTimestampArray(messageEntity.timestamp());
    const concatenatedArray = locationArray.concat(timestampArray);

    return z.message.MessageHashing._createSha256Hash(concatenatedArray);
  },

  /**
   * @param {ContentMessage} messageEntity - The message to hash
   * @returns {Promise<ArrayBuffer>} Promise with hashed text message as ArrayBuffer
   */
  getTextMessageHash: messageEntity => {
    const textAsset = messageEntity.get_first_asset();

    const textArray = z.message.MessageHashing._getTextArray(textAsset);
    const timestampArray = z.message.MessageHashing._getTimestampArray(messageEntity.timestamp());
    const concatenatedArray = textArray.concat(timestampArray);

    return z.message.MessageHashing._createSha256Hash(concatenatedArray);
  },
};
