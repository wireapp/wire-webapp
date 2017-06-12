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
window.z.audio = z.audio || {};

window.z.audio.AudioRepository = class AudioRepository {
  constructor() {
    this.logger = new z.util.Logger('z.audio.AudioRepository', z.config.LOGGER.OPTIONS);
    this.audio_elements = {};
    this.currently_looping = {};
    this.audio_preference = ko.observable(z.audio.AudioPreference.ALL);
    this.audio_preference.subscribe((audio_preference) => {
      if (audio_preference === z.audio.AudioPreference.NONE) {
        this._stop_all();
      }
    });
    this.muted = true;
    this._subscribe_to_events();
  }

  /**
   * Check if sound should be played with current setting.
   * @private
   * @param {z.audio.AudioType} audio_id - Sound identifier
   * @returns {Promise} Resolves if the sound should be played.
   */
  _check_sound_setting(audio_id) {
    return new Promise((resolve, reject) => {
      if (this.muted === true && !(z.audio.AudioPlayingType.MUTED.includes(audio_id))) {
        reject(new z.audio.AudioError(z.audio.AudioError.TYPE.IGNORED_SOUND));
      } else if (this.audio_preference() === z.audio.AudioPreference.NONE && !(z.audio.AudioPlayingType.NONE.includes(audio_id))) {
        reject(new z.audio.AudioError(z.audio.AudioError.TYPE.IGNORED_SOUND));
      } else if (this.audio_preference() === z.audio.AudioPreference.SOME && !(z.audio.AudioPlayingType.SOME.includes(audio_id))) {
        reject(new z.audio.AudioError(z.audio.AudioError.TYPE.IGNORED_SOUND));
      } else {
        resolve();
      }
    });
  }

  /**
   * Create HTMLAudioElement.
   * @private
   * @param {string} source_path - Source for HTMLAudioElement
   * @returns {Audio} Returns the audio element.
   */
  _create_audio_element(source_path) {
    const audio_element = new Audio();
    audio_element.preload = 'none';
    audio_element.src = source_path;
    return audio_element;
  }

  /**
   * Get the sound object
   * @private
   * @param {z.audio.AudioType} audio_id - Sound identifier
   * @returns {Promise} Resolves with the HTMLAudioElement.
   */
  _get_sound_by_id(audio_id) {
    return new Promise((resolve, reject) => {
      if (this.audio_elements[audio_id]) {
        resolve(this.audio_elements[audio_id]);
      } else {
        reject(new z.audio.AudioError(z.audio.AudioError.TYPE.NOT_FOUND));
      }
    });
  }

  /**
   * Initialize all sounds.
   * @private
   * @returns {undefined}
   */
  _init_sounds() {
    for (const type in z.audio.AudioType) {
      if (z.audio.AudioType.hasOwnProperty(type)) {
        const audio_id = z.audio.AudioType[type];
        this.audio_elements[audio_id] = this._create_audio_element(`/audio/${audio_id}.mp3`);
      }
    }
    this.logger.info('Initialized sounds');
  }

  /**
   * Start playback of a sound.
   * @private
   * @param {z.audio.AudioType} audio_id - Sound identifier
   * @param {HTMLAudioElement} audio_element - AudioElement to play
   * @param {boolean} play_in_loop - Play sound in loop
   * @returns {Promise} Resolves with the HTMLAudioElement
   */
  _play(audio_id, audio_element, play_in_loop = false) {
    if (!audio_id || !audio_element) {
      return Promise.reject(new z.audio.AudioError(z.audio.AudioError.TYPE.NOT_FOUND));
    }

    return new Promise((resolve, reject) => {
      if (audio_element.paused) {
        audio_element.loop = play_in_loop;

        if (audio_element.currentTime !== 0) {
          audio_element.currentTime = 0;
        }

        const _play_success = () => {
          if (play_in_loop) {
            this.currently_looping[audio_id] = audio_id;
          }
          resolve(audio_element);
        };

        const play_promise = audio_element.play();

        if (play_promise) {
          play_promise.then(_play_success).catch(() => {
            reject(new z.audio.AudioError(z.audio.AudioError.TYPE.FAILED_TO_PLAY));
          });
        } else {
          _play_success();
        }
      } else {
        reject(new z.audio.AudioError(z.audio.AudioError.TYPE.ALREADY_PLAYING));
      }
    });
  }

  /**
   * Preload all sounds for immediate playback.
   * @private
   * @returns {undefined}
   */
  _preload() {
    for (const audio_id in this.audio_elements) {
      const audio_element = this.audio_elements[audio_id];
      audio_element.preload = 'auto';
      audio_element.load();
    }
    this.logger.info('Pre-loading audio files for immediate playback');
  }

  /**
   * Stop all sounds playing in loop.
   * @private
   * @returns {undefined}
   */
  _stop_all() {
    for (const audio_id in this.currently_looping) {
      this.stop(audio_id);
    }
  }

  /**
   * Use Amplify to subscribe to all audio playback related events.
   * @private
   * @returns {undefined}
   */
  _subscribe_to_audio_events() {
    amplify.subscribe(z.event.WebApp.AUDIO.PLAY, this, this.play);
    amplify.subscribe(z.event.WebApp.AUDIO.PLAY_IN_LOOP, this, this.loop);
    amplify.subscribe(z.event.WebApp.AUDIO.STOP, this, this.stop);
  }

  /**
   * Use Amplify to subscribe to required events.
   * @private
   * @returns {undefined}
   */
  _subscribe_to_events() {
    amplify.subscribe(z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, this, (handling_notifications) => {
      const updated_muted_state_muted_state = handling_notifications !== z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

      if (this.muted !== updated_muted_state_muted_state) {
        this.muted = updated_muted_state_muted_state;
        this.logger.debug(`Set muted state to '${this.muted}'`);
      }
    });

    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, this, (properties) => {
      this.audio_preference(properties.settings.sound.alerts);
    });

    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.SOUND_ALERTS, this, (audio_preference) => {
      this.audio_preference(audio_preference);
    });
  }

  /**
   * Initialize the repository.
   * @param {boolean} pre_load - Should sounds be pre-loaded with false as default
   * @returns {undefined}
   */
  init(pre_load = false) {
    this._init_sounds();
    this._subscribe_to_audio_events();
    if (pre_load) {
      this._preload();
    }
  }

  /**
   * Start playback of a sound in a loop.
   * @note Prevent playing multiples instances of looping sounds
   * @param {z.audio.AudioType} audio_id - Sound identifier
   * @returns {undefined}
   */
  loop(audio_id) {
    this.play(audio_id, true);
  }

  /**
   * Start playback of a sound.
   * @param {z.audio.AudioType} audio_id - Sound identifier
   * @param {boolean} play_in_loop - Play sound in loop
   * @returns {undefined}
   */
  play(audio_id, play_in_loop = false) {
    return this._check_sound_setting(audio_id)
    .then(() => {
      return this._get_sound_by_id(audio_id);
    })
    .then((audio_element) => {
      return this._play(audio_id, audio_element, play_in_loop);
    })
    .then((audio_element) => {
      this.logger.info(`Playing sound '${audio_id}' (loop: '${play_in_loop}')`, audio_element);
    })
    .catch((error) => {
      if (!(error instanceof z.audio.AudioError)) {
        this.logger.error(`Failed playing sound '${audio_id}': ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Stop playback of a sound.
   * @param {z.audio.AudioType} audio_id - Sound identifier
   * @returns {undefined}
   */
  stop(audio_id) {
    return this._get_sound_by_id(audio_id)
    .then((audio_element) => {
      if (!audio_element.paused) {
        this.logger.info(`Stopping sound '${audio_id}'`, audio_element);
        audio_element.pause();
      }

      if (this.currently_looping[audio_id]) {
        delete this.currently_looping[audio_id];
      }
    })
    .catch((error) => {
      this.logger.error(`Failed stopping sound '${audio_id}': ${error.message}`);
      throw error;
    });
  }
};
