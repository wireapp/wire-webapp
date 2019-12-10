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
import {Logger, getLogger} from 'Util/Logger';

import {MediaError} from '../error/MediaError';
import {PermissionError} from '../error/PermissionError';
import {WebAppEvents} from '../event/WebApp';
import {PermissionRepository} from '../permission/PermissionRepository';
import {PermissionStatusState} from '../permission/PermissionStatusState';
import {PermissionType} from '../permission/PermissionType';
import {WarningsViewModel} from '../view_model/WarningsViewModel';
import {MediaConstraintsHandler, ScreensharingMethods} from './MediaConstraintsHandler';
import {MEDIA_STREAM_ERROR} from './MediaStreamError';
import {MEDIA_STREAM_ERROR_TYPES} from './MediaStreamErrorTypes';
import {MediaType} from './MediaType';

declare global {
  interface MediaDevices {
    getDisplayMedia: any;
  }
}

export class MediaStreamHandler {
  static get CONFIG(): any {
    return {PERMISSION_HINT_DELAY: 200};
  }

  private readonly logger: Logger;
  private requestHintTimeout: number | undefined;
  private readonly screensharingMethod: ScreensharingMethods;

  constructor(
    private readonly constraintsHandler: MediaConstraintsHandler,
    private readonly permissionRepository: PermissionRepository,
  ) {
    this.logger = getLogger('MediaStreamHandler');
    this.requestHintTimeout = undefined;

    this.screensharingMethod = ScreensharingMethods.NONE;
    if (window.desktopCapturer) {
      this.screensharingMethod = ScreensharingMethods.DESKTOP_CAPTURER;
    } else if (!!navigator.mediaDevices?.getDisplayMedia) {
      this.screensharingMethod = ScreensharingMethods.DISPLAY_MEDIA;
    } else if (Environment.browser.firefox) {
      this.screensharingMethod = ScreensharingMethods.USER_MEDIA;
    }
  }

  requestMediaStream(audio: boolean, video: boolean, screen: boolean, isGroup: boolean): Promise<MediaStream> {
    const hasPermission = this.hasPermissionToAccess(audio, video);
    return this.getMediaStream(audio, video, screen, isGroup, hasPermission).catch(error => {
      const isPermissionDenied = error.type === PermissionError.TYPE.DENIED;
      throw isPermissionDenied ? new MediaError(MediaError.TYPE.MEDIA_STREAM_PERMISSION) : error;
    });
  }

  selectScreenToShare(showScreenSelection: () => Promise<void>): Promise<void> {
    if (this.screensharingMethod === ScreensharingMethods.DESKTOP_CAPTURER) {
      return showScreenSelection();
    }
    return Promise.resolve();
  }

  /**
   * Check for permission for the requested media type.
   *
   * @private
   * @returns Resolves `true` when permissions is granted
   */
  private hasPermissionToAccess(audio: boolean, video: boolean): boolean {
    const checkPermissionStates = (typesToCheck: PermissionType[]): boolean => {
      const permissions = this.permissionRepository.getPermissionStates(typesToCheck);
      for (const permission of permissions) {
        const {state, type} = permission;
        const isPermissionPrompt = state === PermissionStatusState.PROMPT;
        if (isPermissionPrompt) {
          this.logger.info(`Need to prompt for '${type}' permission`, permissions);
          return false;
        }

        const isPermissionDenied = state === PermissionStatusState.DENIED;
        if (isPermissionDenied) {
          this.logger.warn(`Permission for '${type}' is denied`, permissions);
          return false;
        }
      }

      return true;
    };

    const permissionTypes = [];
    if (audio) {
      permissionTypes.push(PermissionType.MICROPHONE);
    }
    if (video) {
      permissionTypes.push(PermissionType.CAMERA);
    }
    const shouldCheckPermissions = permissionTypes.length;
    return shouldCheckPermissions ? checkPermissionStates(permissionTypes) : true;
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
    hasPermission: boolean,
  ): Promise<MediaStream> {
    const mediaContraints = screen
      ? this.constraintsHandler.getScreenStreamConstraints(this.screensharingMethod)
      : this.constraintsHandler.getMediaStreamConstraints(audio, video, isGroup);

    this.logger.info(`Requesting MediaStream`, mediaContraints);

    const willPromptForPermission = !hasPermission && !Environment.desktop;
    if (willPromptForPermission) {
      this.schedulePermissionHint(audio, video, screen);
    }

    const supportsGetDisplayMedia = screen && this.screensharingMethod === ScreensharingMethods.DISPLAY_MEDIA;
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
          error,
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
    window.clearTimeout(this.requestHintTimeout);
    this.requestHintTimeout = window.setTimeout(() => {
      this.hidePermissionFailedHint(audio, video, screen);
      this.showPermissionRequestHint(audio, video, screen);
      this.requestHintTimeout = undefined;
    }, MediaStreamHandler.CONFIG.PERMISSION_HINT_DELAY);
  }

  private clearPermissionRequestHint(audio: boolean, video: boolean, screen: boolean): void {
    window.clearTimeout(this.requestHintTimeout);
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
