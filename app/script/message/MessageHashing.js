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

window.z = window.z || {};
window.z.message = z.message || {};

z.message.MessageHashing = (() => {
  const _createSha256Hash = buffer => {
    return window.crypto.subtle.subtle.digest('SHA-256', buffer);
  };

  const _convertToUtf16BE = str => {
    const BOMChar = '\uFEFF';

    str = `${BOMChar}${str}`;

    const arr = new TextEncoder().encode(str);

    for (let index = 0; index < arr.length; index += 2) {
      const tempValue = arr[index];
      arr[index] = arr[index + 1];
      arr[index + 1] = tempValue;
    }

    return arr;
  };

  const _getAssetBuffer = content => {
    if (content.uploaded) {
      const assetId = content.uploaded.assetId;
      const withoutDashes = assetId.replace(/-/g, '');
      return Buffer.from(withoutDashes, 'hex');
    }
    return Buffer.from([]);
  };

  const _getTimestampBuffer = timestamp => {
    const timestampBytes = Long.fromInt(timestamp).toBytesBE();
    return Buffer.from(timestampBytes);
  };

  const _getLocationBuffer = content => {
    const latitudeApproximate = Math.round(content.latitude * 1000);
    const longitudeApproximate = Math.round(content.longitude * 1000);

    const latitudeLong = Long.fromInt(latitudeApproximate).toBytesBE();
    const longitudeLong = Long.fromInt(longitudeApproximate).toBytesBE();

    const latitudeBuffer = Buffer.from(latitudeLong);
    const longitudeBuffer = Buffer.from(longitudeLong);

    return Buffer.concat([latitudeBuffer, longitudeBuffer]);
  };

  const _getTextBuffer = asset => {
    return _convertToUtf16BE(asset.text);
  };

  const _getBuffer = content => {
    let buffer;

    if (ContentType.isLocationContent(content)) {
      buffer = this.getLocationBuffer(content);
    } else if (ContentType.isTextContent(content)) {
      buffer = this.getTextBuffer(content);
    } else if (ContentType.isAssetContent(content)) {
      buffer = this.getAssetBuffer(content);
    } else {
      throw new Error(`Unknown message type (message id "${this.message.id}").`);
    }

    const timestampBuffer = this.getTimestampBuffer(this.message.timestamp);
    return Buffer.concat([buffer, timestampBuffer]);
  };
  return {
    getTextMessageHash: messageEntity => {
      const textAsset = messageEntity.get_first_asset();
      const buffer = _getTextBuffer(textAsset);
      console.log(buffer);
      return buffer;
      /*    if (messageContent) {
      const buffer = this.getBuffer(messageContent);
      return this.createSha256Hash(buffer);
    } else {
      throw new Error(`Message with ID "${this.message.id}" has no content.`);
    }*/
    },
  };
})();
