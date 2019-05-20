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

import {getLogger} from 'Util/Logger';
import {Environment} from 'Util/Environment';

import {PermissionStatusState} from '../permission/PermissionStatusState';
import {PermissionType} from '../permission/PermissionType';
import {MEDIA_STREAM_ERROR_TYPES} from './MediaStreamErrorTypes';
import {MediaStreamSource} from './MediaStreamSource';
import {MediaStreamInfo} from './MediaStreamInfo';
import {MediaType} from './MediaType';
import {WebAppEvents} from '../event/WebApp';
import {EventName} from '../tracking/EventName';
import {WarningsViewModel} from '../view_model/WarningsViewModel';

export class MediaStreamHandler {
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
      return hasAudioTrack ? MediaType.AUDIO_VIDEO : MediaType.VIDEO;
    }
    return hasAudioTrack ? MediaType.AUDIO : MediaType.NONE;
  }

  /**
   * Get MediaStreamTracks from a MediaStream.
   *
   * @param {MediaStream} mediaStream - MediaStream to get tracks from
   * @param {MediaType} [mediaType=MediaType.AUDIO_VIDEO] - Type of requested tracks
   * @returns {Array} MediaStreamTracks
   */
  static getMediaTracks(mediaStream, mediaType = MediaType.AUDIO_VIDEO) {
    if (!mediaStream) {
      throw new z.error.MediaError(z.error.MediaError.TYPE.STREAM_NOT_FOUND);
    }

    switch (mediaType) {
      case MediaType.AUDIO: {
        return mediaStream.getAudioTracks();
      }

      case MediaType.AUDIO_VIDEO: {
        return mediaStream.getTracks();
      }

      case MediaType.SCREEN:
      case MediaType.VIDEO: {
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
        CONTAINS_AUDIO: [MediaType.AUDIO, MediaType.AUDIO_VIDEO],
        CONTAINS_VIDEO: [MediaType.AUDIO_VIDEO, MediaType.VIDEO],
      },
      PERMISSION_HINT_DELAY: 200,
    };
  }

  /**
   * Construct a new MediaStream handler.
   * @param {MediaRepository} mediaRepository - Media repository with with references to all other handlers
   * @param {PermissionRepository} permissionRepository - Repository for all permission interactions
   */
  constructor(mediaRepository, permissionRepository) {
    this._toggleScreenSend = this._toggleScreenSend.bind(this);
    this._toggleVideoSend = this._toggleVideoSend.bind(this);

    this.mediaRepository = mediaRepository;
    this.permissionRepository = permissionRepository;
    this.logger = getLogger('MediaStreamHandler');

    this.currentCalls = new Map();
    this.joinedCall = ko.observable();

    this.constraintsHandler = this.mediaRepository.constraintsHandler;
    this.devicesHandler = this.mediaRepository.devicesHandler;
    this.elementHandler = this.mediaRepository.elementHandler;

    this.deviceSupport = this.devicesHandler.deviceSupport;

    this.localMediaStream = ko.observable();
    this.localMediaType = ko.observable(MediaType.AUDIO);

    this.remoteMediaStreamInfo = ko.observableArray([]);
    this.remoteMediaStreamInfoIndex = {
      audio: ko.pureComputed(() => {
        return this.remoteMediaStreamInfo().filter(mediaStreamInfo => {
          return mediaStreamInfo.getType() === MediaType.AUDIO;
        });
      }),
      video: ko.pureComputed(() => {
        const videoTypes = [MediaType.AUDIO_VIDEO, MediaType.VIDEO];
        return this.remoteMediaStreamInfo().filter(mediaStreamInfo => videoTypes.includes(mediaStreamInfo.getType()));
      }),
    };

    this.selfStreamState = {
      audioSend: ko.observable(true),
      screenSend: ko.observable(false),
      videoSend: ko.observable(false),
    };

    this.selfStreamState.audioSend.subscribe(audioSend => {
      this._toggleStreamEnabled(MediaType.AUDIO, audioSend);
    });
    this.selfStreamState.screenSend.subscribe(screenSend => {
      this._toggleStreamEnabled(MediaType.VIDEO, screenSend);
    });
    this.selfStreamState.videoSend.subscribe(videoSend => {
      this._toggleStreamEnabled(MediaType.VIDEO, videoSend);
    });

    this.hasActiveVideo = ko.pureComputed(() => this.selfStreamState.screenSend() || this.selfStreamState.videoSend());

    this.requestHintTimeout = undefined;

    amplify.subscribe(WebAppEvents.CALL.MEDIA.ADD_STREAM, this.addRemoteMediaStream.bind(this));
    amplify.subscribe(WebAppEvents.CALL.MEDIA.CONNECTION_CLOSED, this.removeRemoteMediaStreamTracks.bind(this));
  }

  //##############################################################################
  // Local MediaStream handling
  //##############################################################################

  /**
   * Initiate the MediaStream.
   *
   * @param {string} conversationId - Conversation ID of call
   * @param {MediaType} [mediaType=MediaType.AUDIO] - Media type for this call
   * @param {boolean} [isGroup=false] - Set constraints for group
   * @returns {Promise} Resolves when the MediaStream has been initiated
   */
  initiateMediaStream(conversationId, mediaType = MediaType.AUDIO, isGroup = false) {
    const videoSend = mediaType === MediaType.AUDIO_VIDEO;

    return this.devicesHandler
      .updateCurrentDevices(videoSend)
      .then(() => this.constraintsHandler.getMediaStreamConstraints(true, videoSend, isGroup))
      .then(streamConstraints => this.requestMediaStream(mediaType, streamConstraints))
      .then(mediaStreamInfo => this._initiateMediaStreamSuccess(conversationId, mediaStreamInfo))
      .catch(error => {
        this._initiateMediaStreamFailure(error, conversationId);

        amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.CALLING.FAILED_REQUESTING_MEDIA, {
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
   * @param {MediaStream} mediaStream - the new mediastream (tracks will be cloned, this mediaStream can be disposed of once changed)
   * @param {MediaType} mediaType - Type of the media that needs to be changed
   * @returns {Promise<void>} Resolves when the local media stream and the call have been updated
   */
  changeMediaStream(mediaStream, mediaType) {
    if (!this.localMediaStream()) {
      return Promise.resolve();
    }

    const logMessage = `Received new MediaStream containing '${mediaStream.getTracks().length}' track/s`;
    const logObject = {
      audioTracks: mediaStream.getAudioTracks(),
      stream: mediaStream,
      videoTracks: mediaStream.getVideoTracks(),
    };

    this.logger.debug(logMessage, logObject);
    const newTracks = MediaStreamHandler.getMediaTracks(mediaStream, mediaType);
    const newMediaStream = new MediaStream(newTracks.map(track => track.clone()));
    const mediaStreamInfo = new MediaStreamInfo(MediaStreamSource.LOCAL, 'self', newMediaStream);

    const replacePromise = this.joinedCall()
      ? this._updateJoinedCall(mediaStreamInfo)
      : Promise.resolve({replacedTrack: false, streamInfo: mediaStreamInfo});

    return replacePromise.then(this._handleReplacedMediaStream.bind(this));
  }

  _handleReplacedMediaStream({replacedTrack, streamInfo: mediaStreamInfo}) {
    const replaceMediaStreamLocally = mediaStream => {
      const newMediaStreamType = MediaStreamHandler.detectMediaStreamType(mediaStream);

      this._releaseMediaStream(this.localMediaStream());
      this._setStreamState(mediaStream, newMediaStreamType);
      this.localMediaStream(mediaStream);
    };

    const replaceMediaTracksLocally = mediaStream => {
      const mediaType = MediaStreamHandler.detectMediaStreamType(mediaStream);
      const localMediaStream = this.localMediaStream();

      if (localMediaStream) {
        this.releaseTracksFromStream(localMediaStream, mediaType);
        this._addTracksToStream(mediaStream, localMediaStream, mediaType);
      } else {
        this.localMediaStream(mediaStream);
      }
    };

    return replacedTrack
      ? replaceMediaTracksLocally(mediaStreamInfo.stream)
      : replaceMediaStreamLocally(mediaStreamInfo.stream);
  }

  /**
   * Update the used MediaStream after a new input device was selected.
   * @param {MediaType} mediaType - Media type of device that was replaced
   * @returns {Promise} Resolves when the input source has been replaced
   */
  replaceInputSource(mediaType) {
    const isPreferenceChange = this.currentCalls.size === 0;

    let streamConstraints;
    switch (mediaType) {
      case MediaType.AUDIO: {
        streamConstraints = this.constraintsHandler.getMediaStreamConstraints(true, isPreferenceChange);
        break;
      }

      case MediaType.SCREEN: {
        streamConstraints = this.constraintsHandler.getScreenStreamConstraints();
        break;
      }

      case MediaType.VIDEO: {
        streamConstraints = this.constraintsHandler.getMediaStreamConstraints(isPreferenceChange, true);
        break;
      }

      default: {
        throw new z.error.MediaError(z.error.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
      }
    }

    return this.requestMediaStream(mediaType, streamConstraints)
      .then(({stream}) => {
        this._setSelfStreamState(mediaType);
        this.changeMediaStream(stream, mediaType).then(() => stream.getTracks().forEach(track => track.stop()));
      })
      .catch(error => {
        const isMediaTypeScreen = mediaType === MediaType.SCREEN;
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
   * @param {MediaType} mediaType - Type of MediaStream to be requested
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
   * @param {MediaType} mediaType - Type of track to add
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
   * @param {MediaType} mediaType - Requested media type
   * @returns {Promise} Resolves when the device availability has been verified
   */
  _checkDeviceAvailability(mediaType) {
    const videoTypes = [MediaType.AUDIO_VIDEO, MediaType.VIDEO];
    const noVideoTypes = !this.deviceSupport.videoInput() && videoTypes.includes(mediaType);
    if (noVideoTypes) {
      const mediaError = new z.error.MediaError(z.error.MediaError.TYPE.MEDIA_STREAM_DEVICE, MediaType.VIDEO);
      return Promise.reject(mediaError);
    }

    const audioTypes = [MediaType.AUDIO, MediaType.AUDIO_VIDEO];
    const noAudioDevice = !this.deviceSupport.audioInput() && audioTypes.includes(mediaType);
    if (noAudioDevice) {
      const mediaError = new z.error.MediaError(z.error.MediaError.TYPE.MEDIA_STREAM_DEVICE, MediaType.AUDIO);
      return Promise.reject(mediaError);
    }

    return Promise.resolve();
  }

  /**
   * Check for permission for the requested media type.
   *
   * @private
   * @param {MediaType} mediaType - Requested media type
   * @returns {Promise} Resolves true when permissions is granted
   */
  _hasPermissionToAccess(mediaType) {
    if (!Environment.browser.supports.mediaPermissions) {
      return Promise.resolve(false);
    }

    const checkPermissionStates = typesToCheck => {
      return this.permissionRepository.getPermissionStates(typesToCheck).then(permissions => {
        for (const permission of permissions) {
          const {permissionState, permissionType} = permission;
          const isPermissionPrompt = permissionState === PermissionStatusState.PROMPT;
          if (isPermissionPrompt) {
            this.logger.info(`Need to prompt for '${permissionType}' permission`, permissions);
            return Promise.resolve(false);
          }

          const isPermissionDenied = permissionState === PermissionStatusState.DENIED;
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
   * @param {MediaType} mediaType - Requested media type
   * @returns {Array<PermissionType>} Array containing the necessary permission types
   */
  _getPermissionTypes(mediaType) {
    switch (mediaType) {
      case MediaType.AUDIO: {
        return [PermissionType.MICROPHONE];
      }

      case MediaType.AUDIO_VIDEO: {
        return [PermissionType.CAMERA, PermissionType.MICROPHONE];
      }

      case MediaType.VIDEO: {
        return [PermissionType.CAMERA];
      }
    }
  }

  /**
   * Clear the permission request hint timeout or hide the warning.
   *
   * @private
   * @param {MediaType} mediaType - Type of requested stream
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
   * @param {MediaType} mediaType - Type of requested stream
   * @returns {undefined} No return value
   */
  _hidePermissionFailedHint(mediaType) {
    const warningType = this._selectPermissionDeniedWarningType(mediaType);
    amplify.publish(WebAppEvents.WARNING.DISMISS, warningType);
  }

  /**
   * Hide the permission request hint banner.
   *
   * @private
   * @param {MediaType} mediaType - Type of requested stream
   * @returns {undefined} No return value
   */
  _hidePermissionRequestHint(mediaType) {
    if (!Environment.electron) {
      const warningType = this._selectPermissionRequestWarningType(mediaType);
      amplify.publish(WebAppEvents.WARNING.DISMISS, warningType);
    }
  }

  /**
   * Initial request for local MediaStream was successful.
   *
   * @private
   * @param {string} conversationId - ID of conversation to initiate MediaStream for
   * @param {MediaStreamInfo} mediaStreamInfo - Type of requested MediaStream
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
      const isVideoSend = mediaType === MediaType.AUDIO_VIDEO;
      this.selfStreamState.videoSend(isVideoSend);
      if (isVideoSend) {
        this.localMediaType(MediaType.VIDEO);
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
   * @param {MediaType} [mediaType=MediaType.AUDIO_VIDEO] - Type of MediaStreamTracks to be released
   * @returns {boolean} Have tracks been stopped
   */
  _releaseMediaStream(mediaStream, mediaType = MediaType.AUDIO_VIDEO) {
    return mediaStream ? this.releaseTracksFromStream(mediaStream, mediaType) : false;
  }

  /**
   * Release tracks from a MediaStream.
   *
   * @private
   * @param {MediaStream} mediaStream - MediaStream to release tracks from
   * @param {MediaType} [mediaType=MediaType.AUDIO_VIDEO] - Type of MediaStreamTracks to be released
   * @returns {boolean} Have tracks been stopped
   */
  releaseTracksFromStream(mediaStream, mediaType) {
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
   * @param {MediaType} mediaType - Type of MediaStream to be requested
   * @param {RTCMediaStreamConstraints} mediaStreamConstraints - Constraints for the MediaStream to be requested
   * @param {boolean} hasPermission - Has required media permissions
   * @returns {Promise} Resolves with the stream and its type
   */
  _requestMediaStream(mediaType, mediaStreamConstraints, hasPermission) {
    this.logger.info(`Requesting MediaStream access for '${mediaType}'`, mediaStreamConstraints);

    const willPromptForPermission = !hasPermission && !Environment.desktop;
    if (willPromptForPermission) {
      this._schedulePermissionHint(mediaType);
    }

    const supportsGetDisplayMedia = mediaType === 'screen' && navigator.mediaDevices.getDisplayMedia;
    const mediaAPI = supportsGetDisplayMedia
      ? navigator.mediaDevices.getDisplayMedia
      : navigator.mediaDevices.getUserMedia;

    return mediaAPI
      .call(navigator.mediaDevices, mediaStreamConstraints)
      .then(mediaStream => {
        this._clearPermissionRequestHint(mediaType);
        return new MediaStreamInfo(MediaStreamSource.LOCAL, 'self', mediaStream);
      })
      .catch(error => {
        const {message, name} = error;
        this.logger.warn(`MediaStream request for '${mediaType}' failed: ${name} ${message}`, error);
        this._clearPermissionRequestHint(mediaType);

        if (MEDIA_STREAM_ERROR_TYPES.DEVICE.includes(name)) {
          throw new z.error.MediaError(z.error.MediaError.TYPE.MEDIA_STREAM_DEVICE, mediaType);
        }

        if (MEDIA_STREAM_ERROR_TYPES.MISC.includes(name)) {
          throw new z.error.MediaError(z.error.MediaError.TYPE.MEDIA_STREAM_MISC, mediaType);
        }

        if (MEDIA_STREAM_ERROR_TYPES.PERMISSION.includes(name)) {
          throw new z.error.MediaError(z.error.MediaError.TYPE.MEDIA_STREAM_PERMISSION, mediaType);
        }

        throw error;
      });
  }

  _selectPermissionDeniedWarningType(mediaType) {
    switch (mediaType) {
      case MediaType.AUDIO: {
        return WarningsViewModel.TYPE.DENIED_MICROPHONE;
      }

      case MediaType.SCREEN: {
        return WarningsViewModel.TYPE.DENIED_SCREEN;
      }

      case MediaType.AUDIO_VIDEO:
      case MediaType.VIDEO: {
        return WarningsViewModel.TYPE.DENIED_CAMERA;
      }

      default: {
        throw new z.error.MediaError(z.error.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
      }
    }
  }

  _selectPermissionRequestWarningType(mediaType) {
    switch (mediaType) {
      case MediaType.AUDIO: {
        return WarningsViewModel.TYPE.REQUEST_MICROPHONE;
      }

      case MediaType.SCREEN: {
        return WarningsViewModel.TYPE.REQUEST_SCREEN;
      }

      case MediaType.AUDIO_VIDEO:
      case MediaType.VIDEO: {
        return WarningsViewModel.TYPE.REQUEST_CAMERA;
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
   * @param {MediaType} mediaType - Type of device not found
   * @param {string} conversationId - Optional conversation ID
   * @returns {undefined} No return value
   */
  _showDeviceNotFoundHint(mediaType, conversationId) {
    if (mediaType === MediaType.AUDIO) {
      amplify.publish(WebAppEvents.WARNING.SHOW, WarningsViewModel.TYPE.NOT_FOUND_MICROPHONE);
    } else if (mediaType === MediaType.VIDEO) {
      amplify.publish(WebAppEvents.WARNING.SHOW, WarningsViewModel.TYPE.NOT_FOUND_CAMERA);
    }

    if (conversationId) {
      amplify.publish(WebAppEvents.CALL.STATE.REJECT, conversationId);
    }
  }

  /**
   * Show permission denied hint banner.
   *
   * @private
   * @param {MediaType} mediaType - Type of media access request
   * @returns {undefined} No return value
   */
  _showPermissionDeniedHint(mediaType) {
    const videoTypes = [MediaType.AUDIO_VIDEO, MediaType.VIDEO];
    if (!videoTypes.includes(mediaType)) {
      const warningType = this._selectPermissionDeniedWarningType(mediaType);
      amplify.publish(WebAppEvents.WARNING.SHOW, warningType);
    }
  }

  /**
   * Show permission request hint banner.
   *
   * @private
   * @param {MediaType} mediaType - Type of requested MediaStream
   * @returns {undefined} No return value
   */
  _showPermissionRequestHint(mediaType) {
    if (!Environment.electron) {
      const warningType = this._selectPermissionRequestWarningType(mediaType);
      amplify.publish(WebAppEvents.WARNING.SHOW, warningType);
    }
  }

  /**
   * Update MediaStream used in joined call.
   *
   * @private
   * @param {MediaStreamInfo} mediaStreamInfo - New MediaStream to use
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
   * @param {MediaStreamInfo} mediaStreamInfo - MediaStreamInfo containing new MediaStreamTracks
   * @returns {Promise<MediaStreamInfo>} Resolves with new MediaStream to be used
   */
  _updateMediaStream(mediaStreamInfo) {
    if (!this.localMediaStream()) {
      return Promise.reject(new z.error.MediaError(z.error.MediaError.TYPE.STREAM_NOT_FOUND));
    }

    const mediaType = MediaStreamHandler.detectMediaStreamType(mediaStreamInfo.stream);
    this.releaseTracksFromStream(this.localMediaStream(), mediaType);

    const clonedMediaStream = this.localMediaStream().clone();
    const clonedMediaStreamType = MediaStreamHandler.detectMediaStreamType(clonedMediaStream);
    // Reset MediaStreamTrack enabled states as older Chrome versions fail to copy these when cloning
    this._setStreamState(clonedMediaStream, clonedMediaStreamType);
    this._addTracksToStream(mediaStreamInfo.stream, clonedMediaStream, mediaType);

    this.logger.info(`Upgraded the MediaStream to update '${mediaType}'`, clonedMediaStream);
    return Promise.resolve(new MediaStreamInfo(MediaStreamSource.LOCAL, 'self', clonedMediaStream));
  }

  //##############################################################################
  // Remote MediaStream handling
  //##############################################################################

  /**
   * Add a remote MediaStream.
   * @param {MediaStreamInfo} mediaStreamInfo - MediaStream information
   * @returns {undefined} No return value
   */
  addRemoteMediaStream(mediaStreamInfo) {
    const handledStreamTypes = [MediaType.AUDIO, MediaType.VIDEO, MediaType.AUDIO_VIDEO];
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

  // Toggle the mute state of the microphone.
  toggleAudioSend() {
    return this._toggleAudioSend();
  }

  // Toggle the screen.
  toggleScreenSend() {
    return this._toggleMediaSend(MediaType.SCREEN, this._toggleScreenSend);
  }

  // Toggle the camera.
  toggleVideoSend() {
    return this._toggleMediaSend(MediaType.VIDEO, this._toggleVideoSend);
  }

  // Reset the enabled states of media types.
  resetSelfStates() {
    this.selfStreamState.audioSend(true);
    this.selfStreamState.screenSend(false);
    this.selfStreamState.videoSend(false);
    this.localMediaType(MediaType.AUDIO);
  }

  // Reset the MediaStream and states.
  resetMediaStream() {
    this.releaseMediaStream();
    this.resetSelfStates();
    this.mediaRepository.closeAudioContext();
  }

  /**
   * Set the self stream state to reflect current media type.
   * @param {MediaType} mediaType - Type of state to enable
   * @returns {undefined} No return value
   */
  _setSelfStreamState(mediaType) {
    switch (mediaType) {
      case MediaType.AUDIO: {
        this.selfStreamState.audioSend(true);
        break;
      }

      case MediaType.SCREEN: {
        this.selfStreamState.videoSend(false);
        this.selfStreamState.screenSend(true);
        this.localMediaType(MediaType.SCREEN);
        break;
      }

      case MediaType.VIDEO: {
        this.selfStreamState.videoSend(true);
        this.selfStreamState.screenSend(false);
        this.localMediaType(MediaType.VIDEO);
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
   * @param {MediaType} mediaType - Type to set state for
   * @returns {undefined} No return value
   */
  _setStreamState(mediaStream, mediaType) {
    const includesAudioTracks = MediaStreamHandler.CONFIG.MEDIA_TYPE.CONTAINS_AUDIO.includes(mediaType);
    if (includesAudioTracks) {
      this._setTrackState(mediaStream, MediaType.AUDIO);
    }

    const includesVideoTracks = MediaStreamHandler.CONFIG.MEDIA_TYPE.CONTAINS_VIDEO.includes(mediaType);
    if (includesVideoTracks) {
      this._setTrackState(mediaStream, MediaType.VIDEO);
    }
  }

  _setTrackState(mediaStream, mediaType) {
    const streamTracks = MediaStreamHandler.getMediaTracks(mediaStream, mediaType);

    if (streamTracks.length > 1) {
      this.logger.warn(`Media stream contains multiple '${mediaType}' tracks`, streamTracks);
    }

    const isVideo = mediaType === MediaType.VIDEO;
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
   * @param {MediaType} mediaType - Type of media to toggle
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
   * @param {MediaType} mediaType - Media type to toggle
   * @param {boolean} sendState - New call property send state
   * @returns {undefined} No return value
   */
  _toggleStreamEnabled(mediaType, sendState) {
    const isTypeAudio = mediaType === MediaType.AUDIO;
    if (isTypeAudio) {
      amplify.publish(WebAppEvents.CALL.MEDIA.MUTE_AUDIO, !sendState);
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
}
