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

import moment from 'moment';

window.z = window.z || {};
window.z.components = z.components || {};

class AssetHeader {
  /**
   * Construct a new asset header.
   * @param {Object} params - Component parameters
   * @param {z.entity.Message} params.message - Message entity
   */
  constructor(params) {
    this.message_et = params.message;
    this.moment = moment;
  }
}

ko.components.register('asset-header', {
  template: `
    <span class="asset-header-name" data-bind="text: message_et.user().first_name(), css: message_et.accent_color"></span>
    <span class="asset-header-time" data-bind="text: moment(message_et.timestamp()).format('D.M H:mm')"></span>
  `,
  viewModel: AssetHeader,
});
