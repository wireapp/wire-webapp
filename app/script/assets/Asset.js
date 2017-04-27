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
window.z.assets = z.assets || {};

z.assets.Asset = class Asset {

  /**
   * Construct a new asset for the asset service.
   *
   * @deprecated
   * @param {Object} config - Asset configuration
   */
  constructor(config) {
    this.correlation_id = config.correlation_id || z.util.create_random_uuid();
    this.content_type = config.content_type;
    this.array_buffer = config.array_buffer;
    this.payload = {
      conv_id: config.conversation_id,
      correlation_id: this.correlation_id,
      height: config.height,
      inline: config.inline || false,
      md5: config.md5,
      native_push: config.native_push || false,
      nonce: this.correlation_id,
      original_height: config.original_height || config.width,
      original_width: config.original_width || config.width,
      public: config.public || false,
      tag: config.tag || 'medium',
      width: config.width,
    };
  }

  /**
   * Create the content disposition header for the asset.
   * @returns {string} Content disposition header
   */
  get_content_disposition() {
    const payload = ['zasset'];
    for (const key in this.payload) {
      const value = this.payload[key];
      payload.push(`${key}=${value}`);
    }

    return payload.join(';');
  }
};
