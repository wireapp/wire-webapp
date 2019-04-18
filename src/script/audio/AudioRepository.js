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

import {amplify} from 'amplify';
import {AudioType} from './AudioType';
import {AudioPlayingType} from './AudioPlayingType';
import {AudioPreference} from './AudioPreference';
import {NOTIFICATION_HANDLING_STATE} from '../event/NotificationHandlingState';

import {WebAppEvents} from '../event/WebApp';

const AUDIO_PLAY_PERMISSION = {
  ALLOWED: 0,
  DISALLOWED_BY_MUTE_STATE: 3,
  DISALLOWED_BY_PREFERENCES: 2,
};

export class AudioRepository {
  constructor(logger) {
    this.logger = logger;
    this.audioElements = {};
    this.audioPreference = ko.observable(AudioPreference.ALL);
    this.audioPreference.subscribe(audioPreference => {
      if (audioPreference === AudioPreference.NONE) {
        this._stopAll();
      }
    });
    this.muted = true;
    this._subscribeToEvents();
  }

  /**
   * Check if sound should be played with current setting.
   * @private
   * @param {AudioType} audioId - Sound identifier
   * @returns {AUDIO_PLAY_PERMISSION} Is the sound allowed to be played
   */
  _canPlaySound(audioId) {
    if (this.muted && !AudioPlayingType.MUTED.includes(audioId)) {
      return AUDIO_PLAY_PERMISSION.DISALLOWED_BY_MUTE_STATE;
    }

    const preferenceIsNone = this.audioPreference() === AudioPreference.NONE;
    if (preferenceIsNone && !AudioPlayingType.NONE.includes(audioId)) {
      return AUDIO_PLAY_PERMISSION.DISALLOWED_BY_PREFERENCES;
    }

    const preferenceIsSome = this.audioPreference() === AudioPreference.SOME;
    if (preferenceIsSome && !AudioPlayingType.SOME.includes(audioId)) {
      return AUDIO_PLAY_PERMISSION.DISALLOWED_BY_PREFERENCES;
    }

    return AUDIO_PLAY_PERMISSION.ALLOWED;
  }

  /**
   * Create HTMLAudioElement.
   * @private
   * @param {string} sourcePath - Source for HTMLAudioElement
   * @param {boolean} preload - Should sounds be pre-loaded with false as default
   * @returns {HTMLAudioElement} Returns the audio element.
   */
  _createAudioElement(sourcePath, preload) {
    const audioElement = new Audio();
    audioElement.preload = preload ? 'auto' : 'none';
    if (preload) {
      audioElement.load();
    }
    audioElement.src = sourcePath;
    return audioElement;
  }

  /**
   * Get the sound object
   * @private
   * @param {AudioType} audioId - Sound identifier
   * @returns {Promise} Resolves with the HTMLAudioElement.
   */
  _getSoundById(audioId) {
    return this.audioElements[audioId];
  }

  /**
   * Initialize all sounds.
   * @private
   * @param {boolean} preload - Should sounds be pre-loaded with false as default
   * @returns {undefined}
   */
  _initSounds(preload) {
    Object.values(AudioType).forEach(audioId => {
      this.audioElements[audioId] = this._createAudioElement(`/audio/${audioId}.mp3`, preload);
    });

    this.logger.info(`Sounds initialized (preload: '${preload}')`);
  }

  /**
   * Start playback of a sound.
   * @private
   * @param {HTMLAudioElement} audioElement - AudioElement to play
   * @param {boolean} playInLoop - Play sound in loop
   * @returns {Promise} Resolves with the HTMLAudioElement
   */
  _play(audioElement, playInLoop = false) {
    if (!audioElement.paused) {
      // element already playing, nothing to do
      return Promise.resolve();
    }

    audioElement.loop = playInLoop;

    if (audioElement.currentTime !== 0) {
      audioElement.currentTime = 0;
    }

    const playPromise = audioElement.play();

    return playPromise || Promise.resolve();
  }

  /**
   * Stop all sounds playing in loop.
   * @private
   * @returns {undefined}
   */
  _stopAll() {
    Object.keys(this.audioElements).forEach(audioId => this._stop(this.audioElements[audioId], audioId));
  }

  /**
   * Use Amplify to subscribe to all audio playback related events.
   * @private
   * @returns {undefined}
   */
  _subscribeToAudioEvents() {
    amplify.subscribe(WebAppEvents.AUDIO.PLAY, this.play.bind(this));
    amplify.subscribe(WebAppEvents.AUDIO.PLAY_IN_LOOP, this.loop.bind(this));
    amplify.subscribe(WebAppEvents.AUDIO.STOP, this.stop.bind(this));
  }

  /**
   * Use Amplify to subscribe to required events.
   * @private
   * @returns {undefined}
   */
  _subscribeToEvents() {
    amplify.subscribe(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, this.setMutedState.bind(this));
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, this.updatedProperties.bind(this));
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.SOUND_ALERTS, this.setAudioPreference.bind(this));
  }

  /**
   * Initialize the repository.
   * @param {boolean} preload - Should sounds be pre-loaded with false as default
   * @returns {undefined}
   */
  init(preload = false) {
    this._initSounds(preload);
    this._subscribeToAudioEvents();
  }

  /**
   * Start playback of a sound in a loop.
   * @note Prevent playing multiples instances of looping sounds
   * @param {AudioType} audioId - Sound identifier
   * @returns {undefined}
   */
  loop(audioId) {
    this.play(audioId, true);
  }

  /**
   * Start playback of a sound.
   * @param {AudioType} audioId - Sound identifier
   * @param {boolean} playInLoop - Play sound in loop
   * @returns {Promise<void>} Resolves when the sound has been played (or ignored)
   */
  play(audioId, playInLoop = false) {
    const audioElement = this._getSoundById(audioId);
    if (!audioElement) {
      this.logger.error(`Failed to play '${audioId}': sound not found`);
      return Promise.resolve();
    }

    switch (this._canPlaySound(audioId)) {
      case AUDIO_PLAY_PERMISSION.ALLOWED:
        return this._play(audioElement, playInLoop)
          .then(() => {
            this.logger.info(`Playing sound '${audioId}' (loop: '${playInLoop}')`);
          })
          .catch(error => {
            if (error) {
              this.logger.error(`Failed to play sound '${audioId}': ${error.message}`);
              throw error;
            }
          });

      case AUDIO_PLAY_PERMISSION.DISALLOWED_BY_MUTE_STATE:
        this.logger.debug(`Playing '${audioId}' was disallowed by mute state`);
        break;

      case AUDIO_PLAY_PERMISSION.DISALLOWED_BY_PREFERENCES:
        this.logger.debug(`Playing '${audioId}' was disallowed because of user's preferences`);
        break;
    }
    return Promise.resolve();
  }

  setAudioPreference(audioPreference) {
    this.audioPreference(audioPreference);
  }

  setMutedState(handlingNotifications) {
    const updatedMutedState = handlingNotifications !== NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    const isStateChange = this.muted !== updatedMutedState;
    if (isStateChange) {
      this.muted = updatedMutedState;
      this.logger.debug(`Set muted state to '${this.muted}'`);
    }
  }

  stop(audioId) {
    const audioElement = this._getSoundById(audioId);
    if (audioElement) {
      this._stop(audioElement, audioId);
    }
  }

  /**
   * Stop playback of a sound.
   * @param {Audio} audioElement - Audio element that is playing the sound
   * @param {AudioType} audioId - Sound identifier
   * @returns {undefined}
   */
  _stop(audioElement, audioId) {
    if (!audioElement.paused) {
      this.logger.info(`Stopping sound '${audioId}'`);
      audioElement.pause();
    }
  }

  updatedProperties(properties) {
    this.setAudioPreference(properties.settings.sound.alerts);
  }
}
