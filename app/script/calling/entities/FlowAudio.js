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
window.z.calling = z.calling || {};
window.z.calling.entities = z.calling.entities || {};

z.calling.entities.FlowAudio = class FlowAudio {
  /**
   * Create a new flow audio.
   *
   * @class z.calling.entities.FlowAudio
   * @param {z.entities.Flow} flowEntity - Flow entity
   * @param {MediaRepository} mediaRepository - Media repository
   */
  constructor(flowEntity, mediaRepository) {
    this.setGainNode = this.setGainNode.bind(this);

    this.flowEntity = flowEntity;
    this.mediaRepository = mediaRepository;
    this.logger = new z.util.Logger(`z.calling.FlowAudio (${this.flowEntity.id})`, z.config.LOGGER.OPTIONS);

    this.audioContext = undefined;

    // Panning
    this.panning = this.flowEntity.participantEntity.panning;
    this.panning.subscribe(updatedPanningValue => {
      this.logger.debug(`Panning of ${this.flowEntity.remoteUser.name()} changed to '${updatedPanningValue}'`);
      this.setPan(updatedPanningValue);
    });

    this.panNode = undefined;
    this.gainNode = undefined;
    this.audioSource = undefined;
    this.audioRemote = undefined;

    amplify.subscribe(z.event.WebApp.CALL.MEDIA.MUTE_AUDIO, this.setGainNode);
  }

  /**
   * Hookup flow audio.
   * @param {boolean} isActive - Whether the flow is active
   * @returns {undefined} No return value
   */
  hookup(isActive) {
    if (isActive) {
      return this.hookupAudio();
    }

    if (this.audioSource) {
      this.audioSource.disconnect();
    }
  }

  /**
   * Set muted state on gain node.
   * @param {boolean} isMuted - Muted state
   * @returns {undefined} No return value
   */
  setGainNode(isMuted) {
    if (this.gainNode) {
      if (isMuted) {
        this.gainNode.gain.value = 0;
      } else {
        this.gainNode.gain.value = 1;
      }
      this.logger.debug(`Outgoing audio on flow muted '${isMuted}'`);
    }
  }

  /**
   * Set pan value.
   * @param {number} panningValue - Updated panning value
   * @returns {undefined} No return value
   */
  setPan(panningValue) {
    if (this.panNode) {
      this.panNode.pan.value = panningValue;
    }
  }

  /**
   * Wrap audio input stream.
   * @param {MediaStream} mediaStream - MediaStream to wrap
   * @returns {MediaStream} Wrapped MediaStream
   */
  wrapAudioInputStream(mediaStream) {
    const audioContext = this.getAudioContext();

    if (audioContext) {
      this.audioSource = audioContext.createMediaStreamSource(mediaStream);
      this.gainNode = audioContext.createGain();
      this.audioRemote = audioContext.createMediaStreamDestination();
      this.hookupAudio();

      Object.assign(mediaStream, this.audioRemote.stream);
      this.logger.debug('Wrapped audio stream from microphone', mediaStream);
    }

    return mediaStream;
  }

  /**
   * Wrap audio output stream.
   * @param {MediaStream} mediaStream - MediaStream to wrap
   * @returns {MediaStream} Wrapped MediaStream
   */
  wrapAudioOutputStream(mediaStream) {
    if (z.util.Environment.browser.firefox) {
      const audioContext = this.getAudioContext();

      if (audioContext) {
        const remoteSource = audioContext.createMediaStreamSource(mediaStream);
        const audioOutputDevice = audioContext.createMediaStreamDestination();

        this.panNode = audioContext.createStereoPanner();
        this.panNode.pan.value = this.panning();

        remoteSource.connect(this.panNode);
        this.panNode.connect(audioOutputDevice);

        Object.assign(mediaStream, audioOutputDevice.stream);
        this.logger.debug(
          `Wrapped audio stream to speaker to create stereo. Initial panning set to '${this.panning()}'.`,
          mediaStream
        );
      }
    }

    return mediaStream;
  }

  /**
   * Get running AudioContext.
   * @returns {AudioContext} Active AudioContext
   */
  getAudioContext() {
    if (!this.audioContext || this.audioContext.state === z.media.MediaRepository.AUDIO_CONTEXT_STATE.CLOSED) {
      this.audioContext = this.mediaRepository.getAudioContext();
    }
    return this.audioContext;
  }

  /**
   * Hookup flow audio.
   * @private
   * @returns {undefined} No return value
   */
  hookupAudio() {
    if (this.audioSource && this.gainNode) {
      this.audioSource.connect(this.gainNode);
      this.gainNode.connect(this.audioRemote);
    }
  }
};
