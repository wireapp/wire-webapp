/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
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

(function() {
  window.z = window.z || {};
  window.z.audio = z.audio || {};

  const AUDIO_PATH = '/audio';

  window.z.audio.AudioRepository = class AudioRepository {
    constructor() {
      this.logger = new z.util.Logger('z.audio.AudioRepository', z.config.LOGGER.OPTIONS);
      this.audio_elements = {};
      this.currently_looping = {};
      this.audio_preference = ko.observable(z.audio.AudioPreference.ALL);
      this.audio_preference.subscribe((audio_preference) => {
        if (audio_preference === z.audio.AudioPreference.NONE) {
          return this._stop_all();
        }
      });
      this._subscribe_to_audio_properties();
    }


  };
})();
