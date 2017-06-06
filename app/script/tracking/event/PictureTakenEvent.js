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
window.z.tracking = z.tracking || {};
window.z.tracking.event = z.tracking.event || {};

z.tracking.event.PictureTakenEvent = class PictureTakenEvent {
  /**
   * Construct a phone verification event.
   * @param {string} context - <conversation|registration|profile>
   * @param {string} source - <camera|photoLibrary|giphy|sketch>
   * @param {string} trigger - <cli|button>
   * @returns {PictureTakenEvent} The new PictureTakenEvent
   */
  constructor(context, source, trigger) {
    this.context = context;
    this.source = source;
    this.trigger = trigger;
    this.name = 'PictureTaken';
    this.attributes = {
      context: this.context,
      source: this.source,
      trigger: this.trigger,
    };
  }
};
