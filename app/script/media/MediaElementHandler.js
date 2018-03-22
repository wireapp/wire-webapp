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

'use strict';

window.z = window.z || {};
window.z.media = z.media || {};

z.media.MediaElementHandler = class MediaElementHandler {
  /**
   * Construct an new MediaElement handler.
   * @param {z.media.MediaRepository} media_repository - Repository for media interactions
   */
  constructor(media_repository) {
    this.media_repository = media_repository;
    this.logger = new z.util.Logger('z.media.MediaElementHandler', z.config.LOGGER.OPTIONS);

    this.current_device_id = this.media_repository.devices_handler.current_device_id;
    this.remote_media_elements = ko.observableArray([]);
  }

  /**
   * Add MediaElement for new stream.
   * @param {z.media.MediaStreamInfo} media_stream_info - MediaStream information
   * @returns {undefined} No return value
   */
  add_media_element(media_stream_info) {
    if (media_stream_info.type !== z.media.MediaType.VIDEO) {
      const remote_media_element = this._create_media_element(media_stream_info);
      this.remote_media_elements.push(remote_media_element);
      this.logger.info(
        `Created MediaElement of type '${remote_media_element.nodeName.toLowerCase()}' for MediaStream of flow '${
          media_stream_info.flow_id
        }'`,
        remote_media_element
      );
    }
  }

  /**
   * Destroy the remote media element of a flow.
   * @private
   * @param {string} flow_id - Flow ID for which to destroy the remote media element
   * @returns {undefined} No return value
   */
  remove_media_element(flow_id) {
    this._get_media_elements(flow_id).forEach(media_element => {
      this._destroy_media_element(media_element);
      this.remote_media_elements.remove(media_element);
      this.logger.info(
        `Deleted MediaElement of type '${media_element.tagName.toLocaleLowerCase()}' for flow '${flow_id}'`
      );
    });
  }

  /**
   * Switch the output device used for all MediaElements.
   * @param {string} media_device_id - Media Device ID to be used for playback
   * @returns {undefined} No return value
   */
  switch_media_element_output(media_device_id) {
    this.remote_media_elements().forEach(media_element =>
      this._set_media_element_output(media_element, media_device_id)
    );
  }

  /**
   * Create a new media element.
   *
   * @private
   * @param {z.media.MediaStreamInfo} media_stream_info - MediaStream information
   * @returns {Element} HTMLAudioElement that has the stream attached to it
   */
  _create_media_element(media_stream_info) {
    try {
      const media_element = document.createElement('audio');
      media_element.srcObject = media_stream_info.stream;
      media_element.dataset.conversation_id = media_stream_info.conversation_id;
      media_element.dataset.flow_id = media_stream_info.flow_id;
      media_element.muted = false;
      media_element.setAttribute('autoplay', true);
      if (z.util.Environment.browser.supports.audioOutputSelection) {
        this._set_media_element_output(media_element, this.current_device_id.audio_output());
      }
      return media_element;
    } catch (error) {
      this.logger.error(`Unable to create AudioElement for flow '${media_stream_info.flow_id}'`, error);
    }
  }

  /**
   * Stop the media element.
   *
   * @private
   * @param {HTMLMediaElement} media_element - A HTMLMediaElement that has the media stream attached to it
   * @returns {undefined} No return value
   */
  _destroy_media_element(media_element) {
    if (media_element) {
      media_element.pause();
      media_element.srcObject = undefined;
    }
  }

  /**
   * Get all the MediaElements related to a given flow ID.
   *
   * @private
   * @param {string} flow_id - ID of flow to search MediaElements for
   * @returns {Array<HTMLMediaElement>} Related MediaElements
   */
  _get_media_elements(flow_id) {
    return this.remote_media_elements().filter(media_element => media_element.dataset.flow_id === flow_id);
  }

  /**
   * Change the output device used for audio playback of a media element.
   *
   * @private
   * @param {Element} media_element - HTMLMediaElement to change playback device for
   * @param {string} sink_id - ID of MediaDevice to be used
   * @returns {undefined} No return value
   */
  _set_media_element_output(media_element, sink_id) {
    if (media_element.setSinkId) {
      media_element
        .setSinkId(sink_id)
        .then(() => {
          this.logger.info(
            `Audio output device '${sink_id}' attached to flow '${media_element.dataset.flow_id}`,
            media_element
          );
        })
        .catch(error => {
          this.logger.warn(
            `Failed to attach audio output device '${sink_id}' to flow '${media_element.dataset.flow_id}': ${
              error.message
            }`,
            error
          );
        });
    }
  }
};
