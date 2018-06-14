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

z.media.MediaStreamHandler = class MediaStreamHandler {
  /**
   * Detect whether a MediaStream has a video MediaStreamTrack attached
   * @param {MediaStream} mediaStream - MediaStream to detect the type off
   * @returns {MediaStream} MediaStream with new type information
   */
  static detectMediaStreamType(mediaStream) {
    const audioTracks = mediaStream.getAudioTracks();
    const videoTracks = mediaStream.getVideoTracks();

    const hasAudioTrack = audioTracks && audioTracks.length;
    const hasVideoTrack = videoTracks && videoTracks.length;
    if (hasVideoTrack) {
      mediaStream.type = hasAudioTrack ? z.media.MediaType.AUDIO_VIDEO : z.media.MediaType.VIDEO;
    } else {
      mediaStream.type = hasAudioTrack ? z.media.MediaType.AUDIO : z.media.MediaType.NONE;
    }

    return mediaStream;
  }

  /**
   * Get MediaStreamTracks from a MediaStream.
   *
   * @param {MediaStream} mediaStream - MediaStream to get tracks from
   * @param {z.media.MediaType} [mediaType=z.media.MediaType.AUDIO_VIDEO] - Type of requested tracks
   * @returns {Array} MediaStreamTracks
   */
  static getMediaTracks(mediaStream, mediaType = z.media.MediaType.AUDIO_VIDEO) {
    switch (mediaType) {
      case z.media.MediaType.AUDIO: {
        return mediaStream.getAudioTracks();
      }

      case z.media.MediaType.AUDIO_VIDEO: {
        return mediaStream.getTracks();
      }

      case z.media.MediaType.VIDEO: {
        return mediaStream.getVideoTracks();
      }

      default: {
        throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
      }
    }
  }

  static get CONFIG() {
    return {
      MEDIA_TYPE: {
        CONTAINS_AUDIO: [z.media.MediaType.AUDIO, z.media.MediaType.AUDIO_VIDEO],
        CONTAINS_VIDEO: [z.media.MediaType.AUDIO_VIDEO, z.media.MediaType.VIDEO],
      },
      PERMISSION_HINT_DELAY: 200,
    };
  }

  /**
   * Construct a new MediaStream handler.
   * @param {z.media.MediaRepository} mediaRepository - Media repository with with references to all other handlers
   */
  constructor(mediaRepository) {
    this._toggleScreenSend = this._toggleScreenSend.bind(this);
    this._toggleVideoSend = this._toggleVideoSend.bind(this);

    this.mediaRepository = mediaRepository;
    this.logger = new z.util.Logger('z.media.MediaStreamHandler', z.config.LOGGER.OPTIONS);

    this.calls = () => [];
    this.joinedCall = () => undefined;

    this.constraintsHandler = this.mediaRepository.constraintsHandler;
    this.devicesHandler = this.mediaRepository.devicesHandler;
    this.elementHandler = this.mediaRepository.elementHandler;

    this.localMediaStream = ko.observable();
    this.localMediaType = ko.observable(z.media.MediaType.AUDIO);

    this.remoteMediaStreamInfo = ko.observableArray([]);
    this.remoteMediaStreamInfoIndex = {
      audio: ko.pureComputed(() => {
        return this.remoteMediaStreamInfo().filter(mediaStreamInfo => mediaStreamInfo.type === z.media.MediaType.AUDIO);
      }),
      video: ko.pureComputed(() => {
        const videoTypes = [z.media.MediaType.AUDIO_VIDEO, z.media.MediaType.VIDEO];
        return this.remoteMediaStreamInfo().filter(mediaStreamInfo => videoTypes.includes(mediaStreamInfo.type));
      }),
    };

    this.selfStreamState = {
      audioSend: ko.observable(true),
      screenSend: ko.observable(false),
      videoSend: ko.observable(false),
    };

    this.selfStreamState.audioSend.subscribe(audioSend => {
      this._toggleStreamEnabled(z.media.MediaType.AUDIO, audioSend);
    });
    this.selfStreamState.screenSend.subscribe(screenSend => {
      this._toggleStreamEnabled(z.media.MediaType.VIDEO, screenSend);
    });
    this.selfStreamState.videoSend.subscribe(videoSend => {
      this._toggleStreamEnabled(z.media.MediaType.VIDEO, videoSend);
    });

    this.hasActiveVideo = ko.pureComputed(() => this.selfStreamState.screenSend() || this.selfStreamState.videoSend());

    this.requestHintTimeout = undefined;

    amplify.subscribe(z.event.WebApp.CALL.MEDIA.ADD_STREAM, this.addRemoteMediaStream.bind(this));
    amplify.subscribe(z.event.WebApp.CALL.MEDIA.CONNECTION_CLOSED, this.removeRemoteMediaStreamTracks.bind(this));
  }

  //##############################################################################
  // Local MediaStream handling
  //##############################################################################

  /**
   * Initiate the MediaStream.
   *
   * @param {string} conversationId - Conversation ID of call
   * @param {z.media.MediaType} [mediaType=z.media.MediaType.AUDIO] - Media type for this call
   * @param {boolean} [isGroup=false] - Set constraints for group
   * @returns {Promise} Resolves when the MediaStream has been initiated
   */
  initiateMediaStream(conversationId, mediaType = z.media.MediaType.AUDIO, isGroup = false) {
    const videoSend = mediaType === z.media.MediaType.AUDIO_VIDEO;

    return this.devicesHandler
      .updateCurrentDevices(videoSend)
      .then(() => this.constraintsHandler.getMediaStreamConstraints(true, videoSend, isGroup))
      .then(({streamConstraints}) => this.requestMediaStream(mediaType, streamConstraints))
      .then(mediaStreamInfo => {
        this.selfStreamState.videoSend(videoSend);
        if (videoSend) {
          this.localMediaType(z.media.MediaType.VIDEO);
        }
        return this._initiateMediaStreamSuccess(mediaStreamInfo);
      })
      .catch(error => {
        if (error.mediaType) {
          this._initiateMediaStreamFailure(error, conversationId);
        }

        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CALLING.FAILED_REQUESTING_MEDIA, {
          cause: error.name || error.message,
          video: videoSend,
        });

        throw error;
      });
  }

  /**
   * Release the local MediaStream.
   * @returns {undefined} Not return value
   */
  releaseMediaStream() {
    if (this._releaseMediaStream(this.localMediaStream())) {
      this.localMediaStream(undefined);
    }
  }

  /**
   * Replace the MediaStream after a change of the selected input device.
   * @param {z.media.MediaStreamInfo} mediaStreamInfo - Info about new MediaStream
   * @returns {Promise} Resolves when the MediaStream has been replaced
   */
  replaceMediaStream(mediaStreamInfo) {
    const {stream: mediaStream, type} = mediaStreamInfo;

    const logMessage = `Received new MediaStream containing '${mediaStream.getTracks().length}' track/s`;
    const logObject = {
      audioTracks: mediaStream.getAudioTracks(),
      stream: mediaStream,
      videoTracks: mediaStream.getVideoTracks(),
    };
    this.logger.debug(logMessage, logObject);

    const replacePromise = this.joinedCall()
      ? this._updateJoinedCall(mediaStreamInfo)
      : Promise.resolve(mediaStreamInfo);

    return replacePromise.then(updateMediaStreamInfo => {
      const mediaType = !updateMediaStreamInfo.replaced ? type : undefined;

      this._setStreamState(updateMediaStreamInfo);
      this._releaseMediaStream(this.localMediaStream(), mediaType);
      this.localMediaStream(updateMediaStreamInfo.stream);
    });
  }

  /**
   * Update the used MediaStream after a new input device was selected.
   * @param {z.media.MediaType} inputMediaType - Media type of device that was replaced
   * @returns {Promise} Resolves when the input source has been replaced
   */
  replaceInputSource(inputMediaType) {
    const isPreferenceChange = !this.needsMediaStream();

    let constraintsPromise;
    switch (inputMediaType) {
      case z.media.MediaType.AUDIO: {
        constraintsPromise = this.constraintsHandler.getMediaStreamConstraints(true, isPreferenceChange);
        break;
      }

      case z.media.MediaType.SCREEN: {
        constraintsPromise = this.constraintsHandler.getScreenStreamConstraints();
        break;
      }

      case z.media.MediaType.VIDEO: {
        constraintsPromise = this.constraintsHandler.getMediaStreamConstraints(isPreferenceChange, true);
        break;
      }

      default: {
        throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
      }
    }

    return constraintsPromise
      .then(({mediaType, streamConstraints}) => {
        return this.requestMediaStream(mediaType, streamConstraints).then(mediaStreamInfo => {
          this._setSelfStreamState(mediaType);
          this.replaceMediaStream(mediaStreamInfo);
        });
      })
      .catch(error => {
        const isMediaTypeScreen = inputMediaType === z.media.MediaType.SCREEN;
        const logMessage = isMediaTypeScreen
          ? `Could not enable screen sharing: ${error.message}`
          : `Could not replace '${inputMediaType}' input source: ${error.message}`;
        this.logger.warn(logMessage, error);

        throw error;
      });
  }

  /**
   * Request a MediaStream.
   *
   * @param {z.media.MediaType} mediaType - Type of MediaStream to be requested
   * @param {RTCMediaStreamConstraints} mediaStreamConstraints - Constraints for the MediaStream to be requested
   * @returns {Promise} Resolves with the stream and its type
   */
  requestMediaStream(mediaType, mediaStreamConstraints) {
    const audioTypes = [z.media.MediaType.AUDIO, z.media.MediaType.AUDIO_VIDEO];
    const noAudioDevice = !this.devicesHandler.hasMicrophone() && audioTypes.includes(mediaType);
    if (noAudioDevice) {
      const mediaError = new z.media.MediaError(z.media.MediaError.TYPE.MEDIA_STREAM_DEVICE, z.media.MediaType.AUDIO);
      return Promise.reject(mediaError);
    }

    const videoTypes = [z.media.MediaType.AUDIO_VIDEO, z.media.MediaType.VIDEO];
    const noVideoTypes = !this.devicesHandler.hasCamera() && videoTypes.includes(mediaType);
    if (noVideoTypes) {
      const mediaError = new z.media.MediaError(z.media.MediaError.TYPE.MEDIA_STREAM_DEVICE, z.media.MediaType.VIDEO);
      return Promise.reject(mediaError);
    }

    this.logger.info(`Requesting MediaStream access for '${mediaType}'`, mediaStreamConstraints);
    this.requestHintTimeout = window.setTimeout(() => {
      this._hidePermissionFailedHint(mediaType);
      this._showPermissionRequestHint(mediaType);
      this.requestHintTimeout = undefined;
    }, MediaStreamHandler.CONFIG.PERMISSION_HINT_DELAY);

    return navigator.mediaDevices
      .getUserMedia(mediaStreamConstraints)
      .then(mediaStream => {
        this._clearPermissionRequestHint(mediaType);
        return new z.media.MediaStreamInfo(z.media.MediaStreamSource.LOCAL, 'self', mediaStream);
      })
      .catch(error => {
        const {message, name} = error;
        this.logger.warn(`MediaStream request for '${mediaType}' failed: ${name} ${message}`);
        this._clearPermissionRequestHint(mediaType);

        if (z.media.MEDIA_STREAM_ERROR_TYPES.DEVICE.includes(name)) {
          throw new z.media.MediaError(z.media.MediaError.TYPE.MEDIA_STREAM_DEVICE, mediaType);
        }

        if (z.media.MEDIA_STREAM_ERROR_TYPES.MISC.includes(name)) {
          throw new z.media.MediaError(z.media.MediaError.TYPE.MEDIA_STREAM_MISC, mediaType);
        }

        if (z.media.MEDIA_STREAM_ERROR_TYPES.PERMISSION.includes(name)) {
          throw new z.media.MediaError(z.media.MediaError.TYPE.MEDIA_STREAM_PERMISSION, mediaType);
        }

        throw error;
      });
  }

  /**
   * Clear the permission request hint timeout or hide the warning.
   *
   * @private
   * @param {z.media.MediaType} mediaType - Type of requested stream
   * @returns {undefined} No return value
   */
  _clearPermissionRequestHint(mediaType) {
    if (this.requestHintTimeout) {
      return window.clearTimeout(this.requestHintTimeout);
    }
    this._hidePermissionRequestHint(mediaType);
  }

  /**
   * Hide the permission denied hint banner.
   *
   * @private
   * @param {z.media.MediaType} mediaType - Type of requested stream
   * @returns {undefined} No return value
   */
  _hidePermissionFailedHint(mediaType) {
    const warningType = this._selectPermissionDeniedWarningType(mediaType);
    amplify.publish(z.event.WebApp.WARNING.DISMISS, warningType);
  }

  /**
   * Hide the permission request hint banner.
   *
   * @private
   * @param {z.media.MediaType} mediaType - Type of requested stream
   * @returns {undefined} No return value
   */
  _hidePermissionRequestHint(mediaType) {
    if (!z.util.Environment.electron) {
      const warningType = this._selectPermissionRequestWarningType(mediaType);
      amplify.publish(z.event.WebApp.WARNING.DISMISS, warningType);
    }
  }

  /**
   * Initial request for local MediaStream was successful.
   *
   * @private
   * @param {z.media.MediaStreamInfo} mediaStreamInfo - Type of requested MediaStream
   * @returns {undefined} No return value
   */
  _initiateMediaStreamSuccess(mediaStreamInfo) {
    if (mediaStreamInfo) {
      const {stream: mediaStream} = mediaStreamInfo;

      const logMessage = `Received initial MediaStream containing '${mediaStream.getTracks().length}' tracks/s`;
      const logObject = {
        audioTracks: mediaStream.getAudioTracks(),
        stream: mediaStream,
        videoTracks: mediaStream.getVideoTracks(),
      };
      this.logger.debug(logMessage, logObject);

      this._setStreamState(mediaStreamInfo);
      this.localMediaStream(mediaStream);
    }
  }

  /**
   * Local MediaStream creation failed.
   *
   * @private
   * @param {z.media.MediaError} error - MediaError
   * @param {string} conversationId - Conversation ID
   * @returns {undefined} No return value
   */
  _initiateMediaStreamFailure(error, conversationId) {
    const {type, mediaType} = error;

    const isStreamDeviceError = type === z.media.MediaError.TYPE.MEDIA_STREAM_DEVICE;
    if (isStreamDeviceError) {
      return this._showDeviceNotFoundHint(mediaType, conversationId);
    }

    const isStreamPermissionError = type === z.media.MediaError.TYPE.MEDIA_STREAM_PERMISSION;
    if (isStreamPermissionError) {
      return this._showPermissionDeniedHint(mediaType);
    }

    this._showPermissionDeniedHint(mediaType);
  }

  /**
   * Release the MediaStream.
   *
   * @private
   * @param {MediaStream} mediaStream - MediaStream to be released
   * @param {z.media.MediaType} [mediaType=z.media.MediaType.AUDIO_VIDEO] - Type of MediaStreamTracks to be released
   * @returns {boolean} Have tracks been stopped
   */
  _releaseMediaStream(mediaStream, mediaType = z.media.MediaType.AUDIO_VIDEO) {
    if (mediaStream) {
      const mediaStreamTracks = z.media.MediaStreamHandler.getMediaTracks(mediaStream, mediaType);

      if (mediaStreamTracks.length) {
        mediaStreamTracks.forEach(mediaStreamTrack => {
          mediaStream.removeTrack(mediaStreamTrack);
          mediaStreamTrack.stop();
          this.logger.info(`Stopping MediaStreamTrack of kind '${mediaStreamTrack.kind}' successful`, mediaStreamTrack);
        });

        return true;
      }

      this.logger.warn('No MediaStreamTrack found to stop', mediaStream);
      return false;
    }

    return false;
  }

  _replaceMediaTrack(mediaStreamInfo, flowEntities) {
    const replacementPromises = flowEntities.map(flowEntity => flowEntity.replaceMediaTrack(mediaStreamInfo));
    return Promise.all(replacementPromises).then(() => mediaStreamInfo);
  }

  _replaceMediaStream(mediaStreamInfo, flowEntities) {
    return this._upgradeMediaStream(mediaStreamInfo).then(newMediaStreamInfo => {
      newMediaStreamInfo.replaced = true;

      const upgradePromises = flowEntities.map(flowEntity => {
        return flowEntity.replaceMediaStream(newMediaStreamInfo, this.localMediaStream());
      });
      return Promise.all(upgradePromises).then(() => newMediaStreamInfo);
    });
  }

  _selectPermissionDeniedWarningType(mediaType) {
    switch (mediaType) {
      case z.media.MediaType.AUDIO: {
        return z.viewModel.WarningsViewModel.TYPE.DENIED_MICROPHONE;
      }

      case z.media.MediaType.SCREEN: {
        return z.viewModel.WarningsViewModel.TYPE.DENIED_SCREEN;
      }

      case z.media.MediaType.AUDIO_VIDEO:
      case z.media.MediaType.VIDEO: {
        return z.viewModel.WarningsViewModel.TYPE.DENIED_CAMERA;
      }

      default: {
        throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
      }
    }
  }

  _selectPermissionRequestWarningType(mediaType) {
    switch (mediaType) {
      case z.media.MediaType.AUDIO: {
        return z.viewModel.WarningsViewModel.TYPE.REQUEST_MICROPHONE;
      }

      case z.media.MediaType.SCREEN: {
        return z.viewModel.WarningsViewModel.TYPE.REQUEST_SCREEN;
      }

      case z.media.MediaType.AUDIO_VIDEO:
      case z.media.MediaType.VIDEO: {
        return z.viewModel.WarningsViewModel.TYPE.REQUEST_CAMERA;
      }

      default: {
        throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
      }
    }
  }

  /**
   * Show microphone not found hint banner.
   *
   * @private
   * @param {z.media.MediaType} mediaType - Type of device not found
   * @param {string} conversationId - Optional conversation ID
   * @returns {undefined} No return value
   */
  _showDeviceNotFoundHint(mediaType, conversationId) {
    if (mediaType === z.media.MediaType.AUDIO) {
      amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.NOT_FOUND_MICROPHONE);
    } else if (mediaType === z.media.MediaType.VIDEO) {
      amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.NOT_FOUND_CAMERA);
    }

    if (conversationId) {
      amplify.publish(z.event.WebApp.CALL.STATE.REJECT, conversationId);
    }
  }

  /**
   * Show permission denied hint banner.
   *
   * @private
   * @param {z.media.MediaType} mediaType - Type of media access request
   * @returns {undefined} No return value
   */
  _showPermissionDeniedHint(mediaType) {
    const warningType = this._selectPermissionDeniedWarningType(mediaType);
    amplify.publish(z.event.WebApp.WARNING.SHOW, warningType);
  }

  /**
   * Show permission request hint banner.
   *
   * @private
   * @param {z.media.MediaType} mediaType - Type of requested MediaStream
   * @returns {undefined} No return value
   */
  _showPermissionRequestHint(mediaType) {
    if (!z.util.Environment.electron) {
      const warningType = this._selectPermissionRequestWarningType(mediaType);
      amplify.publish(z.event.WebApp.WARNING.SHOW, warningType);
    }
  }

  /**
   * Update MediaStream used in joined call.
   *
   * @private
   * @param {z.media.MediaStreamInfo} mediaStreamInfo - New MediaStream to use
   * @returns {Promise} Resolves when MediaStream was replaced
   */
  _updateJoinedCall(mediaStreamInfo) {
    this._setStreamState(mediaStreamInfo);
    const flowEntities = this.joinedCall().getFlows();
    const [firstFlowEntity] = flowEntities;

    return firstFlowEntity
      .supportsTrackReplacement(mediaStreamInfo.type)
      .then(replacementSupported => {
        return replacementSupported
          ? this._replaceMediaTrack(mediaStreamInfo, flowEntities)
          : this._replaceMediaStream(mediaStreamInfo, flowEntities);
      })
      .catch(error => {
        const logMessage = `Failed to update call with '${mediaStreamInfo.type}': ${error.name} - ${error.message}`;
        this.logger.error(logMessage, error);
        throw error;
      });
  }

  /**
   * Upgrade the local MediaStream with new MediaStreamTracks.
   *
   * @private
   * @param {z.media.MediaStreamInfo} mediaStreamInfo - MediaStreamInfo containing new MediaStreamTracks
   * @returns {Promise<z.media.MediaStreamInfo>} Resolves with new MediaStream to be used
   */
  _upgradeMediaStream(mediaStreamInfo) {
    if (!this.localMediaStream()) {
      return Promise.reject(new z.media.MediaError(z.media.MediaError.TYPE.STREAM_NOT_FOUND));
    }

    const {stream: newMediaStream, type: mediaType} = mediaStreamInfo;
    z.media.MediaStreamHandler.getMediaTracks(this.localMediaStream(), mediaType).forEach(mediaStreamTrack => {
      this.localMediaStream().removeTrack(mediaStreamTrack);
      mediaStreamTrack.stop();
      this.logger.debug(`Stopping MediaStreamTrack of kind '${mediaStreamTrack.kind}' successful`, mediaStreamTrack);
    });

    const clonedMediaStream = this.localMediaStream().clone();
    // Reset MediaStreamTrack enabled states as older Chrome versions fail to copy these when cloning
    this._setStreamState(clonedMediaStream);

    z.media.MediaStreamHandler.getMediaTracks(newMediaStream, mediaType).forEach(mediaStreamTrack => {
      clonedMediaStream.addTrack(mediaStreamTrack);
    });

    this.logger.info(`Upgraded the MediaStream to update '${mediaType}'`, clonedMediaStream);
    return Promise.resolve(new z.media.MediaStreamInfo(z.media.MediaStreamSource.LOCAL, 'self', clonedMediaStream));
  }

  //##############################################################################
  // Remote MediaStream handling
  //##############################################################################

  /**
   * Add a remote MediaStream.
   * @param {z.media.MediaStreamInfo} mediaStreamInfo - MediaStream information
   * @returns {undefined} No return value
   */
  addRemoteMediaStream(mediaStreamInfo) {
    const handledStreamTypes = [z.media.MediaType.AUDIO, z.media.MediaType.VIDEO, z.media.MediaType.AUDIO_VIDEO];
    if (!handledStreamTypes.includes(mediaStreamInfo.type)) {
      throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
    }

    this.remoteMediaStreamInfo.push(mediaStreamInfo);
    this.elementHandler.addMediaElement(mediaStreamInfo);
  }

  /**
   * Removes the given tracks from the streams containing them.
   * If a stream ends up having no tracks, it gets filtered out from the array of streams
   * removeRemoteMediaStreamTracks
   *
   * @param {MediaStreamTrack[]} tracks - the tracks to remove
   * @returns {void} - void
   */
  removeRemoteMediaStreamTracks(tracks) {
    const filteredMediaStreamsInfo = this.remoteMediaStreamInfo()
      .map(mediaStreamInfo => {
        tracks.forEach(track => mediaStreamInfo.stream.removeTrack(track));
        return mediaStreamInfo;
      })
      .filter(mediaStreamInfo => mediaStreamInfo.stream.getTracks().length);

    this.remoteMediaStreamInfo(filteredMediaStreamsInfo);
  }

  //##############################################################################
  // Media handling
  //##############################################################################

  /**
   * Check for active calls that need a MediaStream.
   * @returns {boolean} Returns true if an active media stream is needed for at least one call
   */
  needsMediaStream() {
    for (const callEntity of this.calls()) {
      const hasPreJoinVideo = callEntity.isIncoming() && callEntity.isRemoteVideoCall();
      if (!callEntity.isOngoingOnAnotherClient() && (callEntity.selfClientJoined() || hasPreJoinVideo)) {
        return true;
      }
    }

    return false;
  }

  // Toggle the mute state of the microphone.
  toggleAudioSend() {
    return this._toggleAudioSend();
  }

  // Toggle the screen.
  toggleScreenSend() {
    return this._toggleMediaSend(z.media.MediaType.SCREEN, this._toggleScreenSend);
  }

  // Toggle the camera.
  toggleVideoSend() {
    return this._toggleMediaSend(z.media.MediaType.VIDEO, this._toggleVideoSend);
  }

  // Reset the enabled states of media types.
  resetSelfStates() {
    this.selfStreamState.audioSend(true);
    this.selfStreamState.screenSend(false);
    this.selfStreamState.videoSend(false);
    this.localMediaType(z.media.MediaType.AUDIO);
  }

  // Reset the MediaStream and states.
  resetMediaStream() {
    if (!this.needsMediaStream()) {
      this.releaseMediaStream();
      this.resetSelfStates();
      this.mediaRepository.closeAudioContext();
    }
  }

  /**
   * Set the self stream state to reflect current media type.
   * @param {z.media.MediaType} mediaType - Type of state to enable
   * @returns {undefined} No return value
   */
  _setSelfStreamState(mediaType) {
    switch (mediaType) {
      case z.media.MediaType.AUDIO: {
        this.selfStreamState.audioSend(true);
        break;
      }

      case z.media.MediaType.SCREEN: {
        this.selfStreamState.videoSend(false);
        this.selfStreamState.screenSend(true);
        this.localMediaType(z.media.MediaType.SCREEN);
        break;
      }

      case z.media.MediaType.VIDEO: {
        this.selfStreamState.videoSend(true);
        this.selfStreamState.screenSend(false);
        this.localMediaType(z.media.MediaType.VIDEO);
        break;
      }

      default: {
        throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
      }
    }
  }

  /**
   * Set the enabled state of a new MediaStream.
   * @private
   * @param {z.media.MediaStreamInfo} mediaStreamInfo - Info about MediaStream to set state off
   * @returns {undefined} No return value
   */
  _setStreamState(mediaStreamInfo) {
    const {stream: mediaStream, type: mediaType} = mediaStreamInfo;

    const includesAudioTracks = MediaStreamHandler.CONFIG.MEDIA_TYPE.CONTAINS_AUDIO.includes(mediaType);
    if (includesAudioTracks) {
      this._setTrackState(mediaStream, z.media.MediaType.AUDIO);
    }

    const includesVideoTracks = MediaStreamHandler.CONFIG.MEDIA_TYPE.CONTAINS_VIDEO.includes(mediaType);
    if (includesVideoTracks) {
      this._setTrackState(mediaStream, z.media.MediaType.VIDEO);
    }
  }

  _setTrackState(mediaStream, mediaType) {
    const streamTracks = z.media.MediaStreamHandler.getMediaTracks(mediaStream, mediaType);

    if (streamTracks.length > 1) {
      this.logger.warn(`Media stream contains multiple '${mediaType}' tracks`, streamTracks);
    }

    const isVideo = mediaType === z.media.MediaType.VIDEO;
    const isEnabledState = isVideo ? this.hasActiveVideo() : this.selfStreamState.audioSend();

    streamTracks.forEach(streamTrack => (streamTrack.enabled = isEnabledState));
    const logMessage = `Set stream '${mediaType}' enabled to '${isEnabledState}' on '${streamTracks.length}' tracks`;
    this.logger.log(logMessage, streamTracks);
  }

  /**
   * Toggle the audio stream.
   * @private
   * @returns {Promise} Resolves when the stream has been toggled
   */
  _toggleAudioSend() {
    return this._toggleSendState(this.selfStreamState.audioSend, 'Microphone');
  }

  /**
   * Toggle the screen stream.
   *
   * @private
   * @param {z.media.MediaType} mediaType - Type of media to toggle
   * @param {Function} toggleFn - Function to toggle type of media
   * @returns {Promise} Resolves when the stream has been toggled
   */
  _toggleMediaSend(mediaType, toggleFn) {
    const hasActiveScreenStream = this.localMediaStream() && this.localMediaType() === mediaType;
    return hasActiveScreenStream ? toggleFn() : this.replaceInputSource(mediaType);
  }

  /**
   * Toggle the screen stream.
   * @private
   * @returns {Promise} Resolves when the stream has been toggled
   */
  _toggleScreenSend() {
    return this._toggleSendState(this.selfStreamState.screenSend, 'Screen');
  }

  /**
   * Toggle a given send state.
   *
   * @private
   * @param {ko.observable} stateObservable - State to toggle
   * @param {string} name - Name of state being toggled
   * @returns {Promise} Resolves when the state has been toggled
   */
  _toggleSendState(stateObservable, name) {
    return Promise.resolve().then(() => {
      stateObservable(!stateObservable());
      this.logger.info(`${name} enabled: ${stateObservable()}`);
      return stateObservable();
    });
  }

  /**
   * Toggle the video stream.
   * @private
   * @returns {Promise} Resolves when the stream has been toggled
   */
  _toggleVideoSend() {
    return this._toggleSendState(this.selfStreamState.videoSend, 'Camera');
  }

  /**
   * Toggle the enabled state of a MediaStream.
   *
   * @private
   * @param {z.media.MediaType} mediaType - Media type to toggle
   * @param {boolean} sendState - New call property send state
   * @returns {undefined} No return value
   */
  _toggleStreamEnabled(mediaType, sendState) {
    const isTypeAudio = mediaType === z.media.MediaType.AUDIO;
    if (isTypeAudio) {
      amplify.publish(z.event.WebApp.CALL.MEDIA.MUTE_AUDIO, !sendState);
    }

    if (this.localMediaStream()) {
      const mediaStreamTracks = z.media.MediaStreamHandler.getMediaTracks(this.localMediaStream(), mediaType);
      mediaStreamTracks.forEach(mediaStreamTrack => (mediaStreamTrack.enabled = sendState));
    }
  }
};
