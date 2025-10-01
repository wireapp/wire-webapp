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

import {container} from 'tsyringe';

import {Runtime} from '@wireapp/commons';

import {CallingViewMode, CallState} from 'Repositories/calling/CallState';
import {BrowserPermissionStatus} from 'Repositories/permission/BrowserPermissionStatus';
import type {PermissionRepository} from 'Repositories/permission/PermissionRepository';
import {PermissionType} from 'Repositories/permission/PermissionType';
import {getLogger, Logger} from 'Util/Logger';

import {MediaConstraintsHandler, ScreensharingMethods} from './MediaConstraintsHandler';
import {MEDIA_STREAM_ERROR} from './MediaStreamError';
import {isMediaStreamReadDeviceError, MEDIA_STREAM_ERROR_TYPES} from './MediaStreamErrorTypes';
import {MediaType} from './MediaType';

import {MediaError} from '../../error/MediaError';
import {NoAudioInputError} from '../../error/NoAudioInputError';
import {PermissionError} from '../../error/PermissionError';
import {Warnings} from '../../view_model/WarningsContainer';

export class MediaStreamHandler {
  static get CONFIG() {
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
    } else if (Runtime.isFirefox()) {
      this.screensharingMethod = ScreensharingMethods.USER_MEDIA;
    }
  }

  requestMediaStream(audio: boolean, video: boolean, screen: boolean, isGroup: boolean): Promise<MediaStream> {
    const hasPermission = this.hasPermissionToAccess(audio, video);
    try {
      return this.getMediaStream(audio, video, screen, isGroup, hasPermission);
    } catch (error) {
      const isPermissionDenied = error.type === PermissionError.TYPE.DENIED;
      throw isPermissionDenied
        ? new MediaError(MediaError.TYPE.MEDIA_STREAM_PERMISSION, MediaError.MESSAGE.MEDIA_STREAM_PERMISSION)
        : error;
    }
  }

  /**
   * The method creates a media stream to enforce access rights to the camera and the microphone. If access is not possible, it starts a user pop-up
   * @param video When `video=true` then the camera is also addressed. In many cases this is not necessary, because one
   * track is enough to enforce the general permissions.
   * @returns Promise with active MediaStream
   */
  requestMediaStreamAccess(video: boolean): Promise<MediaStream | void> {
    return window.navigator.mediaDevices
      .getUserMedia({audio: true, video})
      .then((mediaStream: MediaStream) => mediaStream)
      .catch((error: Error) => {
        if (!isMediaStreamReadDeviceError(error.name)) {
          throw error;
        }
        this.schedulePermissionHint(true, video, false);
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
   * @returns Resolves `true` when permissions is granted
   */
  private hasPermissionToAccess(audio: boolean, video: boolean): boolean {
    const checkPermissionStates = (typesToCheck: PermissionType[]): boolean => {
      const permissions = this.permissionRepository.getPermissionStates(typesToCheck);
      for (const permission of permissions) {
        const {state, type} = permission;
        const isPermissionPrompt = state === BrowserPermissionStatus.PROMPT;
        if (isPermissionPrompt) {
          this.logger.info(`Need to prompt for '${type}' permission`);
          return false;
        }

        const isPermissionDenied = state === BrowserPermissionStatus.DENIED;
        if (isPermissionDenied) {
          this.logger.warn(`Permission for '${type}' is denied`);
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

  releaseTracksFromStream(mediaStream: MediaStream, mediaType?: MediaType): void {
    const mediaStreamTracks = this.getMediaTracks(mediaStream, mediaType);

    mediaStreamTracks.forEach((mediaStreamTrack: MediaStreamTrack) => {
      mediaStreamTrack.stop();
      mediaStream.removeTrack(mediaStreamTrack);
      this.logger.info(`Stopped MediaStreamTrack ID '${mediaStreamTrack.id}' of kind '${mediaStreamTrack.kind}'`);
    });
  }

  private getMediaStream(
    audio: boolean,
    video: boolean,
    screen: boolean,
    isGroup: boolean,
    hasPermission: boolean,
  ): Promise<MediaStream> {
    const mediaConstraints = screen
      ? this.constraintsHandler.getScreenStreamConstraints(this.screensharingMethod)
      : this.constraintsHandler.getMediaStreamConstraints(audio, video, isGroup);

    const willPromptForPermission = !hasPermission && !Runtime.isDesktopApp();
    if (willPromptForPermission) {
      this.schedulePermissionHint(audio, video, screen);
    }

    const callState = container.resolve(CallState);

    const detachedWindow = callState.detachedWindow();
    const isInDetachedMode = callState.viewMode() === CallingViewMode.DETACHED_WINDOW;
    const useDetachedWindowForScreenSharingSource = screen && !video && isInDetachedMode && detachedWindow !== null;

    if (useDetachedWindowForScreenSharingSource) {
      callState.isScreenSharingSourceFromDetachedWindow(true);
    }

    const windowToUse = useDetachedWindowForScreenSharingSource ? detachedWindow : window;

    const supportsGetDisplayMedia = screen && this.screensharingMethod === ScreensharingMethods.DISPLAY_MEDIA;
    const mediaAPI = supportsGetDisplayMedia
      ? windowToUse.navigator.mediaDevices.getDisplayMedia
      : windowToUse.navigator.mediaDevices.getUserMedia;

    return mediaAPI
      .call(windowToUse.navigator.mediaDevices, mediaConstraints)
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
        /**
         * We only want handle errors on pure audio calls here. Video calling errors will be handled in a separate case.
         * @see https://wearezeta.atlassian.net/browse/WEBAPP-7128
         */
        if (
          audio === true &&
          video !== true &&
          [
            MEDIA_STREAM_ERROR.NOT_READABLE_ERROR,
            MEDIA_STREAM_ERROR.NOT_ALLOWED_ERROR,
            MEDIA_STREAM_ERROR.NOT_FOUND_ERROR,
          ].includes(name)
        ) {
          throw new NoAudioInputError(error);
        }

        if (MEDIA_STREAM_ERROR_TYPES.DEVICE.includes(name)) {
          throw new MediaError(MediaError.TYPE.MEDIA_STREAM_DEVICE, MediaError.MESSAGE.MEDIA_STREAM_DEVICE);
        }

        if (MEDIA_STREAM_ERROR_TYPES.MISC.includes(name)) {
          throw new MediaError(MediaError.TYPE.MEDIA_STREAM_MISC, MediaError.MESSAGE.MEDIA_STREAM_MISC);
        }

        if (MEDIA_STREAM_ERROR_TYPES.PERMISSION.includes(name)) {
          throw new MediaError(MediaError.TYPE.MEDIA_STREAM_PERMISSION, MediaError.MESSAGE.MEDIA_STREAM_PERMISSION);
        }

        throw error;
      });
  }

  private getMediaTracks(mediaStream: MediaStream, mediaType: MediaType = MediaType.AUDIO_VIDEO): MediaStreamTrack[] {
    if (!mediaStream) {
      throw new MediaError(MediaError.TYPE.STREAM_NOT_FOUND, MediaError.MESSAGE.STREAM_NOT_FOUND);
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
        throw new MediaError(MediaError.TYPE.UNHANDLED_MEDIA_TYPE, MediaError.MESSAGE.UNHANDLED_MEDIA_TYPE);
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
    Warnings.hideWarning(warningType);
  }

  private hidePermissionRequestHint(audio: boolean, video: boolean, screen: boolean): void {
    if (!Runtime.isDesktopApp()) {
      const warningType = this.selectPermissionRequestWarningType(audio, video, screen);
      Warnings.hideWarning(warningType);
    }
  }

  private selectPermissionDeniedWarningType(audio: boolean, video: boolean, screen: boolean) {
    if (video) {
      return Warnings.TYPE.DENIED_CAMERA;
    }
    if (screen) {
      return Warnings.TYPE.DENIED_SCREEN;
    }
    return Warnings.TYPE.DENIED_MICROPHONE;
  }

  private selectPermissionRequestWarningType(audio: boolean, video: boolean, screen: boolean) {
    if (video) {
      return Warnings.TYPE.REQUEST_CAMERA;
    }
    if (screen) {
      return Warnings.TYPE.REQUEST_SCREEN;
    }
    return Warnings.TYPE.REQUEST_MICROPHONE;
  }

  private showPermissionRequestHint(audio: boolean, video: boolean, screen: boolean): void {
    if (!Runtime.isDesktopApp()) {
      const warningType = this.selectPermissionRequestWarningType(audio, video, screen);
      Warnings.showWarning(warningType);
    }
  }
}
