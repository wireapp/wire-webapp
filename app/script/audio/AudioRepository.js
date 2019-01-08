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

window.z = window.z || {};
window.z.audio = z.audio || {};

window.z.audio.AudioRepository = class AudioRepository {
  constructor() {
    this.logger = new z.util.Logger('z.audio.AudioRepository', z.config.LOGGER.OPTIONS);
    this.audioElements = {};
    this.currentlyLooping = {};
    this.audioPreference = ko.observable(z.audio.AudioPreference.ALL);
    this.audioPreference.subscribe(audioPreference => {
      if (audioPreference === z.audio.AudioPreference.NONE) {
        this._stopAll();
      }
    });
    this.muted = true;
    this._subscribeToEvents();
  }

  /**
   * Check if sound should be played with current setting.
   * @private
   * @param {z.audio.AudioType} audioId - Sound identifier
   * @returns {Promise} Resolves if the sound should be played.
   */
  _checkSoundSetting(audioId) {
    if (this.muted && !z.audio.AudioPlayingType.MUTED.includes(audioId)) {
      return Promise.reject(new z.error.AudioError(z.error.AudioError.TYPE.IGNORED_SOUND));
    }

    const preferenceIsNone = this.audioPreference() === z.audio.AudioPreference.NONE;
    if (preferenceIsNone && !z.audio.AudioPlayingType.NONE.includes(audioId)) {
      return Promise.reject(new z.error.AudioError(z.error.AudioError.TYPE.IGNORED_SOUND));
    }

    const preferenceIsSome = this.audioPreference() === z.audio.AudioPreference.SOME;
    if (preferenceIsSome && !z.audio.AudioPlayingType.SOME.includes(audioId)) {
      return Promise.reject(new z.error.AudioError(z.error.AudioError.TYPE.IGNORED_SOUND));
    }

    return Promise.resolve();
  }

  /**
   * Create HTMLAudioElement.
   * @private
   * @param {string} sourcePath - Source for HTMLAudioElement
   * @returns {HTMLAudioElement} Returns the audio element.
   */
  _createAudioElement(sourcePath) {
    const audioElement = new Audio();
    audioElement.preload = 'none';
    audioElement.src = sourcePath;
    return audioElement;
  }

  /**
   * Get the sound object
   * @private
   * @param {z.audio.AudioType} audioId - Sound identifier
   * @returns {Promise} Resolves with the HTMLAudioElement.
   */
  _getSoundById(audioId) {
    if (this.audioElements[audioId]) {
      return Promise.resolve(this.audioElements[audioId]);
    }
    return Promise.reject(new z.error.AudioError(z.error.AudioError.TYPE.NOT_FOUND));
  }

  /**
   * Initialize all sounds.
   * @private
   * @returns {undefined}
   */
  _initSounds() {
    Object.values(z.audio.AudioType).forEach(audioId => {
      this.audioElements[audioId] = this._createAudioElement(`/audio/${audioId}.mp3`);
    });

    this.logger.info('Initialized sounds');
  }

  /**
   * Start playback of a sound.
   * @private
   * @param {z.audio.AudioType} audioId - Sound identifier
   * @param {HTMLAudioElement} audioElement - AudioElement to play
   * @param {boolean} playInLoop - Play sound in loop
   * @returns {Promise} Resolves with the HTMLAudioElement
   */
  _play(audioId, audioElement, playInLoop = false) {
    if (!audioId || !audioElement) {
      return Promise.reject(new z.error.AudioError(z.error.AudioError.TYPE.NOT_FOUND));
    }

    return new Promise((resolve, reject) => {
      if (audioElement.paused) {
        audioElement.loop = playInLoop;

        if (audioElement.currentTime !== 0) {
          audioElement.currentTime = 0;
        }

        const _playSuccess = () => {
          if (playInLoop) {
            this.currentlyLooping[audioId] = audioId;
          }
          resolve(audioElement);
        };

        const playPromise = audioElement.play();

        if (playPromise) {
          return playPromise
            .then(_playSuccess)
            .catch(() => reject(new z.error.AudioError(z.error.AudioError.TYPE.FAILED_TO_PLAY)));
        }

        _playSuccess();
      } else {
        reject(new z.error.AudioError(z.error.AudioError.TYPE.ALREADY_PLAYING));
      }
    });
  }

  /**
   * Preload all sounds for immediate playback.
   * @private
   * @returns {undefined}
   */
  _preLoad() {
    Object.values(this.audioElements).forEach(audioElement => {
      audioElement.preload = 'auto';
      audioElement.load();
    });

    this.logger.info('Pre-loading audio files for immediate playback');
  }

  /**
   * Stop all sounds playing in loop.
   * @private
   * @returns {undefined}
   */
  _stopAll() {
    Object.keys(this.currentlyLooping).forEach(audioId => this.stop(audioId));
  }

  /**
   * Use Amplify to subscribe to all audio playback related events.
   * @private
   * @returns {undefined}
   */
  _subscribeToAudioEvents() {
    amplify.subscribe(z.event.WebApp.AUDIO.PLAY, this.play.bind(this));
    amplify.subscribe(z.event.WebApp.AUDIO.PLAY_IN_LOOP, this.loop.bind(this));
    amplify.subscribe(z.event.WebApp.AUDIO.STOP, this.stop.bind(this));
  }

  /**
   * Use Amplify to subscribe to required events.
   * @private
   * @returns {undefined}
   */
  _subscribeToEvents() {
    amplify.subscribe(z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, this.setMutedState.bind(this));
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, this.updatedProperties.bind(this));
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.SOUND_ALERTS, this.setAudioPreference.bind(this));
  }

  /**
   * Initialize the repository.
   * @param {boolean} preLoad - Should sounds be pre-loaded with false as default
   * @returns {undefined}
   */
  init(preLoad = false) {
    this._initSounds();
    this._subscribeToAudioEvents();
    if (preLoad) {
      this._preLoad();
    }
  }

  /**
   * Start playback of a sound in a loop.
   * @note Prevent playing multiples instances of looping sounds
   * @param {z.audio.AudioType} audioId - Sound identifier
   * @returns {undefined}
   */
  loop(audioId) {
    this.play(audioId, true);
  }

  /**
   * Start playback of a sound.
   * @param {z.audio.AudioType} audioId - Sound identifier
   * @param {boolean} playInLoop - Play sound in loop
   * @returns {undefined}
   */
  play(audioId, playInLoop = false) {
    this._checkSoundSetting(audioId)
      .then(() => this._getSoundById(audioId))
      .then(audioElement => this._play(audioId, audioElement, playInLoop))
      .then(audioElement => this.logger.info(`Playing sound '${audioId}' (loop: '${playInLoop}')`, audioElement))
      .catch(error => {
        if (!(error instanceof z.error.AudioError)) {
          this.logger.error(`Failed playing sound '${audioId}': ${error.message}`);
          throw error;
        }
      });
  }

  setAudioPreference(audioPreference) {
    this.audioPreference(audioPreference);
  }

  setMutedState(handlingNotifications) {
    const updatedMutedState = handlingNotifications !== z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    const isStateChange = this.muted !== updatedMutedState;
    if (isStateChange) {
      this.muted = updatedMutedState;
      this.logger.debug(`Set muted state to '${this.muted}'`);
    }
  }

  /**
   * Stop playback of a sound.
   * @param {z.audio.AudioType} audioId - Sound identifier
   * @returns {undefined}
   */
  stop(audioId) {
    this._getSoundById(audioId)
      .then(audioElement => {
        if (!audioElement.paused) {
          this.logger.info(`Stopping sound '${audioId}'`, audioElement);
          audioElement.pause();
        }

        if (this.currentlyLooping[audioId]) {
          delete this.currentlyLooping[audioId];
        }
      })
      .catch(error => {
        this.logger.error(`Failed stopping sound '${audioId}': ${error.message}`);
        throw error;
      });
  }

  updatedProperties(properties) {
    this.setAudioPreference(properties.settings.sound.alerts);
  }
};
