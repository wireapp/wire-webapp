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
window.z.media = z.media || {};

z.media.MediaElementHandler = class MediaElementHandler {
  /**
   * Construct an new MediaElement handler.
   * @param {z.media.MediaRepository} mediaRepository - Repository for media interactions
   */
  constructor(mediaRepository) {
    this.mediaRepository = mediaRepository;
    this.logger = new z.util.Logger('z.media.MediaElementHandler', z.config.LOGGER.OPTIONS);

    this.currentDeviceId = this.mediaRepository.devicesHandler.currentDeviceId;
    this.remoteMediaElements = ko.observableArray([]);
  }

  /**
   * Add MediaElement for new stream.
   * @param {z.media.MediaStreamInfo} mediaStreamInfo - MediaStream information
   * @returns {undefined} No return value
   */
  addMediaElement(mediaStreamInfo) {
    const isVideoStream = mediaStreamInfo.getType() === z.media.MediaType.VIDEO;
    if (!isVideoStream) {
      const remoteMediaElement = this._createMediaElement(mediaStreamInfo);
      this.remoteMediaElements.push(remoteMediaElement);

      const elementType = remoteMediaElement.nodeName.toLowerCase();
      const message = `Created MediaElement of type '${elementType}' for flow '${mediaStreamInfo.flowId}'`;
      this.logger.info(message, remoteMediaElement);
    }
  }

  /**
   * Destroy the remote media element of a flow.
   * @private
   * @param {string} flowId - Flow ID for which to destroy the remote media element
   * @returns {undefined} No return value
   */
  removeMediaElement(flowId) {
    this._getMediaElements(flowId).forEach(mediaElement => {
      this._destroyMediaElement(mediaElement);
      this.remoteMediaElements.remove(mediaElement);
      const elementType = mediaElement.tagName.toLocaleLowerCase();
      this.logger.info(`Deleted MediaElement of type '${elementType}' for flow '${flowId}'`);
    });
  }

  /**
   * Switch the output device used for all MediaElements.
   * @param {string} mediaDeviceId - Media Device ID to be used for playback
   * @returns {undefined} No return value
   */
  switchMediaElementOutput(mediaDeviceId) {
    this.remoteMediaElements().forEach(mediaElement => this._setMediaElementOutput(mediaElement, mediaDeviceId));
  }

  /**
   * Create a new media element.
   *
   * @private
   * @param {z.media.MediaStreamInfo} mediaStreamInfo - MediaStream information
   * @returns {Element} HTMLAudioElement that has the stream attached to it
   */
  _createMediaElement(mediaStreamInfo) {
    try {
      const mediaElement = document.createElement('audio');
      mediaElement.srcObject = mediaStreamInfo.stream;
      mediaElement.dataset.conversationId = mediaStreamInfo.conversationId;
      mediaElement.dataset.flowId = mediaStreamInfo.flowId;
      mediaElement.muted = false;
      mediaElement.setAttribute('autoplay', true);
      if (z.util.Environment.browser.supports.audioOutputSelection) {
        this._setMediaElementOutput(mediaElement, this.currentDeviceId.audioOutput());
      }
      return mediaElement;
    } catch (error) {
      this.logger.error(`Unable to create AudioElement for flow '${mediaStreamInfo.flowId}'`, error);
    }
  }

  /**
   * Stop the media element.
   *
   * @private
   * @param {HTMLMediaElement} mediaElement - A HTMLMediaElement that has the media stream attached to it
   * @returns {undefined} No return value
   */
  _destroyMediaElement(mediaElement) {
    if (mediaElement) {
      mediaElement.pause();
      mediaElement.srcObject = undefined;
    }
  }

  /**
   * Get all the MediaElements related to a given flow ID.
   *
   * @private
   * @param {string} flowId - ID of flow to search MediaElements for
   * @returns {Array<HTMLMediaElement>} Related MediaElements
   */
  _getMediaElements(flowId) {
    return this.remoteMediaElements().filter(mediaElement => mediaElement.dataset.flowId === flowId);
  }

  /**
   * Change the output device used for audio playback of a media element.
   *
   * @private
   * @param {Element} mediaElement - HTMLMediaElement to change playback device for
   * @param {string} sinkId - ID of MediaDevice to be used
   * @returns {undefined} No return value
   */
  _setMediaElementOutput(mediaElement, sinkId) {
    if (mediaElement.setSinkId) {
      const flowId = mediaElement.dataset.flowId;

      mediaElement
        .setSinkId(sinkId)
        .then(() => this.logger.info(`Audio output device '${sinkId}' attached to flow '${flowId}`, mediaElement))
        .catch(error => {
          const message = `Failed to attach audio output device '${sinkId}' to flow '${flowId}': ${error.message}`;
          this.logger.warn(message, error);
        });
    }
  }
};
