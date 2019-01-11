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

z.media.MediaStreamHandler = class MediaStreamHandler {
  /**
   * Detect whether a MediaStream has a video MediaStreamTrack attached
   * @param {MediaStream} mediaStream - MediaStream to detect the type off
   * @returns {MediaType} Media type information
   */
  static detectMediaStreamType(mediaStream) {
    const audioTracks = mediaStream.getAudioTracks();
    const videoTracks = mediaStream.getVideoTracks();

    const hasAudioTrack = audioTracks && audioTracks.length;
    const hasVideoTrack = videoTracks && videoTracks.length;
    if (hasVideoTrack) {
      return hasAudioTrack ? z.media.MediaType.AUDIO_VIDEO : z.media.MediaType.VIDEO;
    }
    return hasAudioTrack ? z.media.MediaType.AUDIO : z.media.MediaType.NONE;
  }

  /**
   * Get MediaStreamTracks from a MediaStream.
   *
   * @param {MediaStream} mediaStream - MediaStream to get tracks from
   * @param {z.media.MediaType} [mediaType=z.media.MediaType.AUDIO_VIDEO] - Type of requested tracks
   * @returns {Array} MediaStreamTracks
   */
  static getMediaTracks(mediaStream, mediaType = z.media.MediaType.AUDIO_VIDEO) {
    if (!mediaStream) {
      throw new z.error.MediaError(z.error.MediaError.TYPE.STREAM_NOT_FOUND);
    }

    switch (mediaType) {
      case z.media.MediaType.AUDIO: {
        return mediaStream.getAudioTracks();
      }

      case z.media.MediaType.AUDIO_VIDEO: {
        return mediaStream.getTracks();
      }

      case z.media.MediaType.SCREEN:
      case z.media.MediaType.VIDEO: {
        return mediaStream.getVideoTracks();
      }

      default: {
        throw new z.error.MediaError(z.error.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
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
   * @param {z.permission.PermissionRepository} permissionRepository - Repository for all permission interactions
   */
  constructor(mediaRepository, permissionRepository) {
    this._toggleScreenSend = this._toggleScreenSend.bind(this);
    this._toggleVideoSend = this._toggleVideoSend.bind(this);

    this.mediaRepository = mediaRepository;
    this.permissionRepository = permissionRepository;
    this.logger = new z.util.Logger('z.media.MediaStreamHandler', z.config.LOGGER.OPTIONS);

    this.currentCalls = new Map();
    this.joinedCall = ko.observable();

    this.constraintsHandler = this.mediaRepository.constraintsHandler;
    this.devicesHandler = this.mediaRepository.devicesHandler;
    this.elementHandler = this.mediaRepository.elementHandler;

    this.deviceSupport = this.devicesHandler.deviceSupport;

    this.localMediaStream = ko.observable();
    this.localMediaType = ko.observable(z.media.MediaType.AUDIO);

    this.remoteMediaStreamInfo = ko.observableArray([]);
    this.remoteMediaStreamInfoIndex = {
      audio: ko.pureComputed(() => {
        return this.remoteMediaStreamInfo().filter(mediaStreamInfo => {
          return mediaStreamInfo.getType() === z.media.MediaType.AUDIO;
        });
      }),
      video: ko.pureComputed(() => {
        const videoTypes = [z.media.MediaType.AUDIO_VIDEO, z.media.MediaType.VIDEO];
        return this.remoteMediaStreamInfo().filter(mediaStreamInfo => videoTypes.includes(mediaStreamInfo.getType()));
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
      .then(streamConstraints => this.requestMediaStream(mediaType, streamConstraints))
      .then(mediaStreamInfo => this._initiateMediaStreamSuccess(conversationId, mediaStreamInfo))
      .catch(error => {
        this._initiateMediaStreamFailure(error, conversationId);

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
   * @returns {undefined} No return value
   */
  changeMediaStream(mediaStreamInfo) {
    const mediaStream = mediaStreamInfo.stream;

    const logMessage = `Received new MediaStream containing '${mediaStream.getTracks().length}' track/s`;
    const logObject = {
      audioTracks: mediaStream.getAudioTracks(),
      stream: mediaStream,
      videoTracks: mediaStream.getVideoTracks(),
    };
    this.logger.debug(logMessage, logObject);

    const replacePromise = this.joinedCall()
      ? this._updateJoinedCall(mediaStreamInfo)
      : Promise.resolve({replacedTrack: false, streamInfo: mediaStreamInfo});

    replacePromise.then(this._handleReplacedMediaStream.bind(this));
  }

  _handleReplacedMediaStream({replacedTrack, streamInfo: mediaStreamInfo}) {
    const replaceMediaStreamLocally = newMediaStreamInfo => {
      const newMediaStream = newMediaStreamInfo.stream;
      const newMediaStreamType = newMediaStreamInfo.getType();

      this._releaseMediaStream(this.localMediaStream());
      this._setStreamState(newMediaStream, newMediaStreamType);
      this.localMediaStream(newMediaStream);
    };

    const replaceMediaTracksLocally = newMediaStreamInfo => {
      const mediaStream = newMediaStreamInfo.stream;
      const mediaType = newMediaStreamInfo.getType();
      const localMediaStream = this.localMediaStream();

      if (localMediaStream) {
        this._releaseTracksFromStream(localMediaStream, mediaType);
        this._addTracksToStream(mediaStream, localMediaStream, mediaType);
      } else {
        this.localMediaStream(mediaStream);
      }
    };

    return replacedTrack ? replaceMediaTracksLocally(mediaStreamInfo) : replaceMediaStreamLocally(mediaStreamInfo);
  }

  /**
   * Update the used MediaStream after a new input device was selected.
   * @param {z.media.MediaType} mediaType - Media type of device that was replaced
   * @returns {Promise} Resolves when the input source has been replaced
   */
  replaceInputSource(mediaType) {
    const isPreferenceChange = this.currentCalls.size === 0;

    let constraintsPromise;
    switch (mediaType) {
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
        throw new z.error.MediaError(z.error.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
      }
    }

    return constraintsPromise
      .then(streamConstraints => this.requestMediaStream(mediaType, streamConstraints))
      .then(mediaStreamInfo => {
        // FIXME: the mediaStreamInUse should be more intelligent and handle all scenarios where the stream is actually needed
        if (!isPreferenceChange && !this.mediaStreamInUse()) {
          // in case the stream is returned after the call has actually ended, we need to release the stream right away
          this.logger.warn('Releasing obsolete MediaStream as there is no active call', mediaStreamInfo);
          return this._releaseMediaStream(mediaStreamInfo.stream);
        }

        this._setSelfStreamState(mediaType);
        this.changeMediaStream(mediaStreamInfo);
      })
      .catch(error => {
        const isMediaTypeScreen = mediaType === z.media.MediaType.SCREEN;
        const logMessage = isMediaTypeScreen
          ? `Could not enable screen sharing: ${error.message}`
          : `Could not replace '${mediaType}' input source: ${error.message}`;
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
    return this._checkDeviceAvailability(mediaType)
      .then(() => this._hasPermissionToAccess(mediaType))
      .then(hasPermission => this._requestMediaStream(mediaType, mediaStreamConstraints, hasPermission))
      .catch(error => {
        const isPermissionDenied = error.type === z.error.PermissionError.TYPE.DENIED;
        throw isPermissionDenied
          ? new z.error.MediaError(z.error.MediaError.TYPE.MEDIA_STREAM_PERMISSION, mediaType)
          : error;
      });
  }

  /**
   * Add tracks to a new stream.
   *
   * @private
   * @param {MediaStream} sourceStream - MediaStream to take tracks from
   * @param {MediaStream} targetStream - MediaStream to add tracks to
   * @param {z.media.MediaType} mediaType - Type of track to add
   * @returns {undefined} Not return value
   */
  _addTracksToStream(sourceStream, targetStream, mediaType) {
    const mediaStreamTracks = MediaStreamHandler.getMediaTracks(sourceStream, mediaType);
    mediaStreamTracks.forEach(mediaStreamTrack => targetStream.addTrack(mediaStreamTrack));
  }

  /**
   * Check for devices of requested media type.
   *
   * @private
   * @param {z.media.MediaType} mediaType - Requested media type
   * @returns {Promise} Resolves when the device availability has been verified
   */
  _checkDeviceAvailability(mediaType) {
    const videoTypes = [z.media.MediaType.AUDIO_VIDEO, z.media.MediaType.VIDEO];
    const noVideoTypes = !this.deviceSupport.videoInput() && videoTypes.includes(mediaType);
    if (noVideoTypes) {
      const mediaError = new z.error.MediaError(z.error.MediaError.TYPE.MEDIA_STREAM_DEVICE, z.media.MediaType.VIDEO);
      return Promise.reject(mediaError);
    }

    const audioTypes = [z.media.MediaType.AUDIO, z.media.MediaType.AUDIO_VIDEO];
    const noAudioDevice = !this.deviceSupport.audioInput() && audioTypes.includes(mediaType);
    if (noAudioDevice) {
      const mediaError = new z.error.MediaError(z.error.MediaError.TYPE.MEDIA_STREAM_DEVICE, z.media.MediaType.AUDIO);
      return Promise.reject(mediaError);
    }

    return Promise.resolve();
  }

  /**
   * Check for permission for the requested media type.
   *
   * @private
   * @param {z.media.MediaType} mediaType - Requested media type
   * @returns {Promise} Resolves true when permissions is granted
   */
  _hasPermissionToAccess(mediaType) {
    if (!z.util.Environment.browser.supports.mediaPermissions) {
      return Promise.resolve(false);
    }

    const checkPermissionStates = typesToCheck => {
      return this.permissionRepository.getPermissionStates(typesToCheck).then(permissions => {
        for (const permission of permissions) {
          const {permissionState, permissionType} = permission;
          const isPermissionPrompt = permissionState === z.permission.PermissionStatusState.PROMPT;
          if (isPermissionPrompt) {
            this.logger.info(`Need to prompt for '${permissionType}' permission`, permissions);
            return Promise.resolve(false);
          }

          const isPermissionDenied = permissionState === z.permission.PermissionStatusState.DENIED;
          if (isPermissionDenied) {
            this.logger.warn(`Permission for '${permissionType}' is denied`, permissions);
            return Promise.reject(new z.error.PermissionError(z.error.PermissionError.TYPE.DENIED));
          }
        }

        return Promise.resolve(true);
      });
    };

    const permissionTypes = this._getPermissionTypes(mediaType);
    const shouldCheckPermissions = permissionTypes && permissionTypes.length;
    return shouldCheckPermissions ? checkPermissionStates(permissionTypes) : Promise.resolve(true);
  }

  /**
   * Get permission types for the requested media type.
   *
   * @private
   * @param {z.media.MediaType} mediaType - Requested media type
   * @returns {Array<z.permission.PermissionType>} Array containing the necessary permission types
   */
  _getPermissionTypes(mediaType) {
    switch (mediaType) {
      case z.media.MediaType.AUDIO: {
        return [z.permission.PermissionType.MICROPHONE];
      }

      case z.media.MediaType.AUDIO_VIDEO: {
        return [z.permission.PermissionType.CAMERA, z.permission.PermissionType.MICROPHONE];
      }

      case z.media.MediaType.VIDEO: {
        return [z.permission.PermissionType.CAMERA];
      }
    }
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
   * @param {string} conversationId - ID of conversation to initiate MediaStream for
   * @param {z.media.MediaStreamInfo} mediaStreamInfo - Type of requested MediaStream
   * @returns {undefined} No return value
   */
  _initiateMediaStreamSuccess(conversationId, mediaStreamInfo) {
    if (mediaStreamInfo) {
      const callEntity = this.currentCalls.get(conversationId);
      const callNeedsMediaStream = callEntity && callEntity.needsMediaStream();
      const mediaStream = mediaStreamInfo.stream;

      if (!callNeedsMediaStream) {
        this.logger.warn(`Releasing obsolete MediaStream as call '${conversationId}' is no longer active`, callEntity);
        return this._releaseMediaStream(mediaStream);
      }

      const mediaType = mediaStreamInfo.getType();
      const isVideoSend = mediaType === z.media.MediaType.AUDIO_VIDEO;
      this.selfStreamState.videoSend(isVideoSend);
      if (isVideoSend) {
        this.localMediaType(z.media.MediaType.VIDEO);
      }

      const logMessage = `Received initial MediaStream containing '${mediaStream.getTracks().length}' tracks/s`;
      const logObject = {
        audioTracks: mediaStream.getAudioTracks(),
        stream: mediaStream,
        videoTracks: mediaStream.getVideoTracks(),
      };
      this.logger.debug(logMessage, logObject);

      this._setStreamState(mediaStream, mediaType);
      this.localMediaStream(mediaStream);
    }
  }

  /**
   * Local MediaStream creation failed.
   *
   * @private
   * @param {z.error.MediaError} error - MediaError
   * @param {string} conversationId - Conversation ID
   * @returns {undefined} No return value
   */
  _initiateMediaStreamFailure(error, conversationId) {
    const {type, mediaType} = error;

    if (mediaType) {
      const isStreamDeviceError = type === z.error.MediaError.TYPE.MEDIA_STREAM_DEVICE;
      return isStreamDeviceError
        ? this._showDeviceNotFoundHint(mediaType, conversationId)
        : this._showPermissionDeniedHint(mediaType);
    }
  }

  /**
   * Release a MediaStream.
   *
   * @private
   * @param {MediaStream} mediaStream - MediaStream to be released
   * @param {z.media.MediaType} [mediaType=z.media.MediaType.AUDIO_VIDEO] - Type of MediaStreamTracks to be released
   * @returns {boolean} Have tracks been stopped
   */
  _releaseMediaStream(mediaStream, mediaType = z.media.MediaType.AUDIO_VIDEO) {
    return mediaStream ? this._releaseTracksFromStream(mediaStream, mediaType) : false;
  }

  /**
   * Release tracks from a MediaStream.
   *
   * @private
   * @param {MediaStream} mediaStream - MediaStream to release tracks from
   * @param {z.media.MediaType} [mediaType=z.media.MediaType.AUDIO_VIDEO] - Type of MediaStreamTracks to be released
   * @returns {boolean} Have tracks been stopped
   */
  _releaseTracksFromStream(mediaStream, mediaType) {
    const mediaStreamTracks = MediaStreamHandler.getMediaTracks(mediaStream, mediaType);

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

  _schedulePermissionHint(mediaType) {
    this.requestHintTimeout = window.setTimeout(() => {
      this._hidePermissionFailedHint(mediaType);
      this._showPermissionRequestHint(mediaType);
      this.requestHintTimeout = undefined;
    }, MediaStreamHandler.CONFIG.PERMISSION_HINT_DELAY);
  }

  /**
   * Request a MediaStream.
   *
   * @private
   * @param {z.media.MediaType} mediaType - Type of MediaStream to be requested
   * @param {RTCMediaStreamConstraints} mediaStreamConstraints - Constraints for the MediaStream to be requested
   * @param {boolean} hasPermission - Has required media permissions
   * @returns {Promise} Resolves with the stream and its type
   */
  _requestMediaStream(mediaType, mediaStreamConstraints, hasPermission) {
    this.logger.info(`Requesting MediaStream access for '${mediaType}'`, mediaStreamConstraints);

    const willPromptForPermission = !hasPermission && !z.util.Environment.desktop;
    if (willPromptForPermission) {
      this._schedulePermissionHint(mediaType);
    }

    return navigator.mediaDevices
      .getUserMedia(mediaStreamConstraints)
      .then(mediaStream => {
        this._clearPermissionRequestHint(mediaType);
        return new z.media.MediaStreamInfo(z.media.MediaStreamSource.LOCAL, 'self', mediaStream);
      })
      .catch(error => {
        const {message, name} = error;
        this.logger.warn(`MediaStream request for '${mediaType}' failed: ${name} ${message}`, error);
        this._clearPermissionRequestHint(mediaType);

        if (z.media.MEDIA_STREAM_ERROR_TYPES.DEVICE.includes(name)) {
          throw new z.error.MediaError(z.error.MediaError.TYPE.MEDIA_STREAM_DEVICE, mediaType);
        }

        if (z.media.MEDIA_STREAM_ERROR_TYPES.MISC.includes(name)) {
          throw new z.error.MediaError(z.error.MediaError.TYPE.MEDIA_STREAM_MISC, mediaType);
        }

        if (z.media.MEDIA_STREAM_ERROR_TYPES.PERMISSION.includes(name)) {
          throw new z.error.MediaError(z.error.MediaError.TYPE.MEDIA_STREAM_PERMISSION, mediaType);
        }

        throw error;
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
        throw new z.error.MediaError(z.error.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
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
        throw new z.error.MediaError(z.error.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
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
    const videoTypes = [z.media.MediaType.AUDIO_VIDEO, z.media.MediaType.VIDEO];
    if (!videoTypes.includes(mediaType)) {
      const warningType = this._selectPermissionDeniedWarningType(mediaType);
      amplify.publish(z.event.WebApp.WARNING.SHOW, warningType);
    }
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
    this._setStreamState(mediaStreamInfo.stream, mediaStreamInfo.getType());
    const flowEntities = this.joinedCall().getFlows();
    const [firstFlowEntity] = flowEntities;

    const replaceMediaTrackInFlows = (streamInfo, flows) => {
      const replacementPromises = flows.map(flowEntity => flowEntity.replaceMediaTrack(streamInfo));
      return Promise.all(replacementPromises).then(() => ({replacedTrack: true, streamInfo}));
    };

    const replaceMediaStreamInFlows = (streamInfo, flows) => {
      return this._updateMediaStream(streamInfo).then(newMediaStreamInfo => {
        const upgradePromises = flows.map(flowEntity => {
          return flowEntity.replaceMediaStream(newMediaStreamInfo, this.localMediaStream());
        });
        return Promise.all(upgradePromises).then(() => ({replacedTrack: false, streamInfo: newMediaStreamInfo}));
      });
    };

    return firstFlowEntity
      .supportsTrackReplacement(mediaStreamInfo.getType())
      .then(canReplaceTracks => {
        return canReplaceTracks
          ? replaceMediaTrackInFlows(mediaStreamInfo, flowEntities)
          : replaceMediaStreamInFlows(mediaStreamInfo, flowEntities);
      })
      .catch(error => {
        const message = `Failed to update call with '${mediaStreamInfo.getType()}': ${error.name} - ${error.message}`;
        this.logger.error(message, error);
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
  _updateMediaStream(mediaStreamInfo) {
    if (!this.localMediaStream()) {
      return Promise.reject(new z.error.MediaError(z.error.MediaError.TYPE.STREAM_NOT_FOUND));
    }

    const newMediaStream = mediaStreamInfo.stream;
    const mediaType = mediaStreamInfo.getType();
    this._releaseTracksFromStream(this.localMediaStream(), mediaType);

    const clonedMediaStream = this.localMediaStream().clone();
    const clonedMediaStreamType = MediaStreamHandler.detectMediaStreamType(clonedMediaStream);
    // Reset MediaStreamTrack enabled states as older Chrome versions fail to copy these when cloning
    this._setStreamState(clonedMediaStream, clonedMediaStreamType);
    this._addTracksToStream(newMediaStream, clonedMediaStream, mediaType);

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
    if (!handledStreamTypes.includes(mediaStreamInfo.getType())) {
      throw new z.error.MediaError(z.error.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
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
  mediaStreamInUse() {
    for (const callEntity of this.currentCalls.values()) {
      const callNeedsMediaStream = callEntity.needsMediaStream();
      if (callNeedsMediaStream) {
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
    if (!this.mediaStreamInUse()) {
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
        throw new z.error.MediaError(z.error.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
      }
    }
  }

  /**
   * Set the enabled state of a new MediaStream.
   * @private
   * @param {MediaStream} mediaStream - MediaStream to set state on
   * @param {z.media.MediaType} mediaType - Type to set state for
   * @returns {undefined} No return value
   */
  _setStreamState(mediaStream, mediaType) {
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
    const streamTracks = MediaStreamHandler.getMediaTracks(mediaStream, mediaType);

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
      const mediaStreamTracks = MediaStreamHandler.getMediaTracks(this.localMediaStream(), mediaType);
      mediaStreamTracks.forEach(mediaStreamTrack => (mediaStreamTrack.enabled = sendState));
    }
  }

  updateCurrentCalls(callEntities) {
    this.currentCalls.clear();
    callEntities.forEach(callEntity => this.currentCalls.set(callEntity.id, callEntity));
  }

  setJoinedCall(callEntity) {
    this.joinedCall(callEntity);
  }
};
