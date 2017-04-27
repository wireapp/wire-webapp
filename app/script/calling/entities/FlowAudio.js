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
   * @param {z.entities.EFlow|z.entities.Flow} flow_et - Flow entity
   * @param {AudioContext} audio_context - AudioContext to use
   */
  constructor(flow_et, audio_context) {
    this.flow_et = flow_et;
    this.audio_context = audio_context;
    this.logger = new z.util.Logger(`z.calling.FlowAudio (${this.flow_et.id})`, z.config.LOGGER.OPTIONS);

    // Panning
    if (this.flow_et.e_participant_et) {
      this.panning = this.flow_et.e_participant_et.panning;
    } else {
      this.panning = this.flow_et.participant_et.panning;
    }
    this.panning.subscribe((updated_panning_value) => {
      this.logger.debug(`Panning of ${this.flow_et.remote_user.name()} changed to '${updated_panning_value}'`);
      this.set_pan(updated_panning_value);
    });

    this.pan_node = undefined;
    this.gain_node = undefined;
    this.audio_source = undefined;
    this.audio_remote = undefined;

    amplify.subscribe(z.event.WebApp.CALL.MEDIA.MUTE_AUDIO, this.set_gain_node.bind(this));
  }

  /**
   * Hookup flow audio.
   * @param {boolean} is_active - Whether the flow is active
   * @returns {undefined} No return value
   */
  hookup(is_active) {
    if (is_active === true) {
      return this._hookup_audio();
    }

    if (this.audio_source) {
      this.audio_source.disconnect();
    }
  }

  /**
   * Set muted state on gain node.
   * @param {boolean} is_muted - Muted state
   * @returns {undefined} No return value
   */
  set_gain_node(is_muted) {
    if (this.gain_node) {
      if (is_muted) {
        this.gain_node.gain.value = 0;
      } else {
        this.gain_node.gain.value = 1;
      }
      this.logger.debug(`Outgoing audio on flow muted '${is_muted}'`);
    }
  }

  /**
   * Set pan value.
   * @param {number} panning_value - Updated panning value
   * @returns {undefined} No return value
   */
  set_pan(panning_value) {
    if (this.pan_node) {
      this.pan_node.pan.value = panning_value;
    }
  }

  /**
   * Wrap audio input stream.
   * @param {MediaStream} media_stream - MediaStream to wrap
   * @returns {MediaStream} Wrapped MediaStream
   */
  wrap_audio_input_stream(media_stream) {
    if (this.audio_context) {
      this.audio_source = this.audio_context.createMediaStreamSource(media_stream);
      this.gain_node = this.audio_context.createGain();
      this.audio_remote = this.audio_context.createMediaStreamDestination();
      this._hookup_audio();

      $.extend(true, media_stream, this.audio_remote.stream);
      this.logger.debug('Wrapped audio stream from microphone', media_stream);
    }

    return media_stream;
  }

  /**
   * Wrap audio output stream.
   * @param {MediaStream} media_stream - MediaStream to wrap
   * @returns {MediaStream} Wrapped MediaStream
   */
  wrap_audio_output_stream(media_stream) {
    if (z.util.Environment.browser.firefox && this.audio_context) {
      const remote_source = this.audio_context.createMediaStreamSource(media_stream);
      const audio_output_device = this.audio_context.createMediaStreamDestination();

      this.pan_node = this.audio_context.createStereoPanner();
      this.pan_node.pan.value = this.panning();

      remote_source.connect(this.pan_node);
      this.pan_node.connect(audio_output_device);

      $.extend(true, media_stream, audio_output_device.stream);
      this.logger.debug(`Wrapped audio stream to speaker to create stereo. Initial panning set to '${this.panning()}'.`, media_stream);
    }

    return media_stream;
  }

  /**
   * Hookup flow audio.
   * @private
   * @returns {undefined} No return value
   */
  _hookup_audio() {
    if (this.audio_source && this.gain_node) {
      this.audio_source.connect(this.gain_node);
      this.gain_node.connect(this.audio_remote);
    }
  }
};
