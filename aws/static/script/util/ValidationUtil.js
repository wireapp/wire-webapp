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
window.z.util = z.util || {};

z.util.ValidationUtil = {
  // ToDo: Move z.util.isValidUsername here
  // ToDo: Move z.util.isValidPhoneNumber here
  // ToDo: Move z.util.isIsoString here
  // ToDo: Move z.util.isValidEmail here
  // ToDo: Move z.util.isSameLocation here
  asset: {
    legacy: (assetId, conversationId) => {
      if (!z.util.ValidationUtil.isUUID(assetId) || !z.util.ValidationUtil.isUUID(conversationId)) {
        throw new z.util.ValidationUtilError('Invalid assetId / conversationId');
      }
      return true;
    },

    // https://github.com/wireapp/wire-server/blob/dc3e9a8af5250c0d045e96a31aa23c255b4e01a3/libs/cargohold-types/src/CargoHold/Types/V3.hs#L156-L177
    retentionPolicy: policyId => policyId > 0 && policyId < Object.keys(z.assets.AssetRetentionPolicy).length + 1,

    v3: (assetKey, assetToken) => {
      if (!assetKey) {
        throw new z.util.ValidationUtilError('Asset key not defined');
      }

      const SEPARATOR = '-';
      const [version, type, ...uuid] = assetKey.split(SEPARATOR);

      if (version !== '3') {
        throw new z.util.ValidationUtilError('Invalid asset key (version)');
      }
      if (!z.util.ValidationUtil.asset.retentionPolicy(type)) {
        throw new z.util.ValidationUtilError('Invalid asset key (type)');
      }
      if (!z.util.ValidationUtil.isUUID(uuid.join(SEPARATOR))) {
        throw new z.util.ValidationUtilError('Invalid asset key (UUID)');
      }
      if (assetToken && !z.util.ValidationUtil.isBearerToken(assetToken)) {
        throw new z.util.ValidationUtilError('Invalid asset token');
      }
      return true;
    },
  },

  isBase64: string => {
    try {
      // Will raise a DOM exception if base64 string is invalid
      window.atob(string);
    } catch (error) {
      return false;
    }
    return true;
  },

  // Since some special chars are allowed, remember to always encode Bearer tokens using encodeURIComponents afterwards!
  isBearerToken: token => /^[a-zA-Z0-9\-._~+/]+[=]{0,2}$/.test(token),

  isUUID: string => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(string),

  isValidApiPath: path => {
    const [urlPath] = path.split('?');
    if (!/^\/[a-zA-Z0-9\-_/,]+$/.test(urlPath)) {
      throw new z.util.ValidationUtilError(`Non-compliant path creation attempt. Details: ${path}`);
    }
    return true;
  },

  urls: {
    isTweet: url => {
      const regex = /^http(?:s)?:\/\/(?:(?:www|mobile|0)\.)?twitter\.com\/(?:(?:\w{1,15})\/status(?:es|\/i)?|i\/moments)\/(?:\d{2,21})(?:(?:\?|\/).*)?$/;
      return regex.test(url);
    },
  },
};
