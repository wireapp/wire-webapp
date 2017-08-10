/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
  // ToDo: Move z.util.is_valid_username here
  // ToDo: Move z.util.is_valid_phone_number here
  // ToDo: Move z.util.is_iso_string here
  // ToDo: Move z.util.is_valid_email here
  // ToDo: Move z.util.is_same_location here
  asset: {
    retentionPolicy: (str) => {
      // Ensure the given asset is either eternal, persistent or volatile
      // https://github.com/wireapp/wire-server/blob/e97f7c882cad37e4ddd922d2e48fe0d71751fc5a/libs/cargohold-types/src/CargoHold/Types/V3.hs#L151
      return str > 0 && str < (Object.keys(z.assets.AssetRetentionPolicy).length + 1);
    },
    v2: () => {
      // ToDo: Validate asset v2
    },
    v3: (asset_key, asset_token) => {
      const SEPERATOR = '-';
      const [version, type, ...uuid] = asset_key.split(SEPERATOR);

      if (version !== '3') {
        throw new Error('Invalid asset key (version)');
      }
      if (!z.util.ValidationUtil.asset.retentionPolicy(type)) {
        throw new Error('Invalid asset key (type)');
      }
      if (!z.util.ValidationUtil.isUUID(uuid.join(SEPERATOR))) {
        throw new Error('Invalid asset key (UUID)');
      }
      if (asset_token && !z.util.ValidationUtil.isBase64(asset_token)) {
        throw new Error('Invalid asset token (malformed base64)');
      }
    },
  },
  isBase64: (str) => {
    try {
      // Will raise a DOM exception if base64 string is invalid
      window.atob(str);
    } catch (error) {
      return false;
    }
    return true;
  },
  isUUID: (str) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
  },
};
