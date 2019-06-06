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
import {Environment} from 'Util/Environment';
import {getLogger} from 'Util/Logger';

import {MediaError} from '../error/MediaError';
import {PermissionError} from '../error/PermissionError';
import {WebAppEvents} from '../event/WebApp';
import {PermissionStatusState} from '../permission/PermissionStatusState';
import {PermissionType} from '../permission/PermissionType';
import {WarningsViewModel} from '../view_model/WarningsViewModel';
import {MEDIA_STREAM_ERROR} from './MediaStreamError';
import {MEDIA_STREAM_ERROR_TYPES} from './MediaStreamErrorTypes';
import {MediaType} from './MediaType';

export class MediaStreamHandler {
  static get CONFIG(): any {
    return {
      MEDIA_TYPE: {
        CONTAINS_AUDIO: [MediaType.AUDIO, MediaType.AUDIO_VIDEO],
        CONTAINS_VIDEO: [MediaType.AUDIO_VIDEO, MediaType.VIDEO],
      },
      PERMISSION_HINT_DELAY: 200,
    };
  }

  private readonly logger: any;
  private readonly constraintsHandler: any;
  private readonly deviceSupport: any;

  private requestHintTimeout: number | undefined;

  /**
   * Construct a new MediaStream handler.
   * @param {MediaRepository} mediaRepository - Media repository with with references to all other handlers
   * @param {PermissionRepository} permissionRepository - Repository for all permission interactions
   */
  constructor(private readonly mediaRepository: any, private readonly permissionRepository: any) {
    this.logger = getLogger('MediaStreamHandler');
    this.constraintsHandler = this.mediaRepository.constraintsHandler;
    this.deviceSupport = this.mediaRepository.devicesHandler.deviceSupport;

    this.requestHintTimeout = undefined;
  }

  /**
   * Request a MediaStream.
   *
   * @param {MediaType} mediaType - Type of MediaStream to be requested
   * @param {RTCMediaStreamConstraints} mediaStreamConstraints - Constraints for the MediaStream to be requested
   * @returns {Promise} Resolves with the stream and its type
   */
  requestMediaStream(audio: boolean, video: boolean, screen: boolean, isGroup: boolean): Promise<MediaStream> {
    return this.checkDeviceAvailability(audio, video, screen)
      .then(() => this.hasPermissionToAccess(audio, video))
      .then(hasPermission => this.getMediaStream(audio, video, screen, isGroup, hasPermission))
      .catch(error => {
        const isPermissionDenied = error.type === PermissionError.TYPE.DENIED;
        throw isPermissionDenied ? new MediaError(MediaError.TYPE.MEDIA_STREAM_PERMISSION) : error;
      });
  }

  /**
   * Check for devices of requested media type.
   *
   * @private
   * @param {MediaType} mediaType - Requested media type
   * @returns {Promise} Resolves when the device availability has been verified
   */
  private checkDeviceAvailability(audio: boolean, video: boolean, screen: boolean): Promise<void> {
    const noVideoTypes = video && !this.deviceSupport.videoInput();
    if (noVideoTypes) {
      const mediaError = new MediaError(MediaError.TYPE.MEDIA_STREAM_DEVICE);
      return Promise.reject(mediaError);
    }

    const noAudioDevice = audio && !this.deviceSupport.audioInput();
    if (noAudioDevice) {
      const mediaError = new MediaError(MediaError.TYPE.MEDIA_STREAM_DEVICE);
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
  private hasPermissionToAccess(audio: boolean, video: boolean): Promise<boolean> {
    if (!Environment.browser.supports.mediaPermissions) {
      return Promise.resolve(false);
    }

    const checkPermissionStates = (typesToCheck: PermissionType[]) => {
      return this.permissionRepository.getPermissionStates(typesToCheck).then((permissions: any[]) => {
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
            return Promise.reject(new PermissionError(PermissionError.TYPE.DENIED));
          }
        }

        return Promise.resolve(true);
      });
    };

    const permissionTypes = [];
    if (audio) {
      permissionTypes.push(PermissionType.MICROPHONE);
    }
    if (video) {
      permissionTypes.push(PermissionType.CAMERA);
    }
    const shouldCheckPermissions = permissionTypes && permissionTypes.length;
    return shouldCheckPermissions ? checkPermissionStates(permissionTypes) : Promise.resolve(true);
  }

  releaseTracksFromStream(mediaStream: MediaStream, mediaType: MediaType): boolean {
    const mediaStreamTracks = this.getMediaTracks(mediaStream, mediaType);

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

  private getMediaStream(
    audio: boolean,
    video: boolean,
    screen: boolean,
    isGroup: boolean,
    hasPermission: boolean
  ): Promise<MediaStream> {
    const mediaContraints = screen
      ? this.constraintsHandler.getScreenStreamConstraints()
      : this.constraintsHandler.getMediaStreamConstraints(audio, video, isGroup);

    this.logger.info(`Requesting MediaStream`, mediaContraints);

    const willPromptForPermission = !hasPermission && !Environment.desktop;
    if (willPromptForPermission) {
      this.schedulePermissionHint(audio, video, screen);
    }

    const supportsGetDisplayMedia = screen && navigator.mediaDevices.getDisplayMedia;
    const mediaAPI = supportsGetDisplayMedia
      ? navigator.mediaDevices.getDisplayMedia
      : navigator.mediaDevices.getUserMedia;

    return mediaAPI
      .call(navigator.mediaDevices, mediaContraints)
      .then((mediaStream: MediaStream) => {
        this.clearPermissionRequestHint(audio, video, screen);
        return mediaStream;
      })
      .catch((error: Error) => {
        const message = error.message;
        const name = error.name as MEDIA_STREAM_ERROR;
        this.logger.warn(
          `MediaStream request for (audio: ${audio}, video: ${video}, screen: ${screen}) failed: ${name} ${message}`,
          error
        );
        this.clearPermissionRequestHint(audio, video, screen);

        if (MEDIA_STREAM_ERROR_TYPES.DEVICE.includes(name)) {
          throw new MediaError(MediaError.TYPE.MEDIA_STREAM_DEVICE);
        }

        if (MEDIA_STREAM_ERROR_TYPES.MISC.includes(name)) {
          throw new MediaError(MediaError.TYPE.MEDIA_STREAM_MISC);
        }

        if (MEDIA_STREAM_ERROR_TYPES.PERMISSION.includes(name)) {
          throw new MediaError(MediaError.TYPE.MEDIA_STREAM_PERMISSION);
        }

        throw error;
      });
  }

  private getMediaTracks(mediaStream: MediaStream, mediaType: MediaType = MediaType.AUDIO_VIDEO): MediaStreamTrack[] {
    if (!mediaStream) {
      throw new MediaError(MediaError.TYPE.STREAM_NOT_FOUND);
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
        throw new MediaError(MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
      }
    }
  }

  private schedulePermissionHint(audio: boolean, video: boolean, screen: boolean): void {
    this.requestHintTimeout = window.setTimeout(() => {
      this.hidePermissionFailedHint(audio, video, screen);
      this.showPermissionRequestHint(audio, video, screen);
      this.requestHintTimeout = undefined;
    }, MediaStreamHandler.CONFIG.PERMISSION_HINT_DELAY);
  }

  private clearPermissionRequestHint(audio: boolean, video: boolean, screen: boolean): void {
    if (this.requestHintTimeout) {
      return window.clearTimeout(this.requestHintTimeout);
    }
    this.hidePermissionRequestHint(audio, video, screen);
  }

  private hidePermissionFailedHint(audio: boolean, video: boolean, screen: boolean): void {
    const warningType = this.selectPermissionDeniedWarningType(audio, video, screen);
    amplify.publish(WebAppEvents.WARNING.DISMISS, warningType);
  }

  private hidePermissionRequestHint(audio: boolean, video: boolean, screen: boolean): void {
    if (!Environment.electron) {
      const warningType = this.selectPermissionRequestWarningType(audio, video, screen);
      amplify.publish(WebAppEvents.WARNING.DISMISS, warningType);
    }
  }

  private selectPermissionDeniedWarningType(audio: boolean, video: boolean, screen: boolean): any {
    if (video) {
      return WarningsViewModel.TYPE.DENIED_CAMERA;
    }
    if (screen) {
      return WarningsViewModel.TYPE.DENIED_SCREEN;
    }
    return WarningsViewModel.TYPE.DENIED_MICROPHONE;
  }

  private selectPermissionRequestWarningType(audio: boolean, video: boolean, screen: boolean): any {
    if (video) {
      return WarningsViewModel.TYPE.REQUEST_CAMERA;
    }
    if (screen) {
      return WarningsViewModel.TYPE.REQUEST_SCREEN;
    }
    return WarningsViewModel.TYPE.REQUEST_MICROPHONE;
  }

  private showPermissionRequestHint(audio: boolean, video: boolean, screen: boolean): void {
    if (!Environment.electron) {
      const warningType = this.selectPermissionRequestWarningType(audio, video, screen);
      amplify.publish(WebAppEvents.WARNING.SHOW, warningType);
    }
  }
}
