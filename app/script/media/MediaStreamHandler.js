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
window.z.media = z.media || {};

z.media.MediaStreamHandler = class MediaStreamHandler {
  /**
   * Detect whether a MediaStream has a video MediaStreamTrack attached
   * @param {MediaStream} media_stream - MediaStream to detect the type off
   * @returns {MediaStream} MediaStream with new type information
   */
  static detect_media_stream_type(media_stream) {
    const audio_tracks = media_stream.getAudioTracks();
    const video_tracks = media_stream.getVideoTracks();

    if (video_tracks && video_tracks.length) {
      if (audio_tracks && audio_tracks.length) {
        media_stream.type = z.media.MediaType.AUDIO_VIDEO;
      } else {
        media_stream.type = z.media.MediaType.VIDEO;
      }
    } else if (audio_tracks && audio_tracks.length) {
      media_stream.type = z.media.MediaType.AUDIO;
    } else {
      media_stream.type = z.media.MediaType.NONE;
    }
    return media_stream;
  }

  /**
   * Get MediaStreamTracks from a MediaStream.
   *
   * @param {MediaStream} media_stream - MediaStream to get tracks from
   * @param {z.media.MediaType} [media_type=z.media.MediaType.AUDIO_VIDEO] - Type of requested tracks
   * @returns {Array} MediaStreamTracks
   */
  static get_media_tracks(media_stream, media_type = z.media.MediaType.AUDIO_VIDEO) {
    switch (media_type) {
      case z.media.MediaType.AUDIO:
        return media_stream.getAudioTracks();
      case z.media.MediaType.AUDIO_VIDEO:
        return media_stream.getTracks();
      case z.media.MediaType.VIDEO:
        return media_stream.getVideoTracks();
      default:
        throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
    }
  }

  /**
   * Construct a new MediaStream handler.
   * @param {z.media.MediaRepository} media_repository - Media repository with with references to all other handlers
   */
  constructor(media_repository) {
    this.media_repository = media_repository;
    this.logger = new z.util.Logger('z.media.MediaDevicesHandler', z.config.LOGGER.OPTIONS);

    this.calls = () => [];
    this.joined_call = () => undefined;

    this.current_device_id = this.media_repository.devices_handler.current_device_id;

    this.local_media_stream = ko.observable();
    this.local_media_type = ko.observable(z.media.MediaType.AUDIO);

    this.remote_media_streams = {
      audio: ko.observableArray([]),
      video: ko.observable(),
    };

    this.self_stream_state = {
      audio_send: ko.observable(true),
      screen_send: ko.observable(false),
      video_send: ko.observable(false),
    };

    this.request_hint_timeout = undefined;
    amplify.subscribe(z.event.WebApp.CALL.MEDIA.ADD_STREAM, this.add_remote_media_stream.bind(this));
  }


  //##############################################################################
  // MediaStream constraints
  //##############################################################################

  /**
   * Get the MediaStreamConstraints to be used for MediaStream creation.
   *
   * @private
   * @param {boolean} [request_audio=false] - Request audio in the constraints
   * @param {boolean} [request_video=false] - Request video in the constraints
   * @returns {Promise} Resolves with MediaStreamConstraints and their type
   */
  get_media_stream_constraints(request_audio = false, request_video = false) {
    return Promise.resolve()
    .then(() => {
      const constraints = {
        audio: request_audio ? this._get_audio_stream_constraints(this.current_device_id.audio_input()) : undefined,
        video: request_video ? this._get_video_stream_constraints(this.current_device_id.video_input()) : undefined,
      };
      const media_type = request_video ? z.media.MediaType.VIDEO : z.media.MediaType.AUDIO;
      return {media_stream_constraints: constraints, media_type: media_type};
    });
  }

  /**
   * Get the video constraints to be used for MediaStream creation.
   * @private
   * @param {string} media_device_id - Optional ID of MediaDevice to be used
   * @returns {Object} Video stream constraints
   */
  _get_audio_stream_constraints(media_device_id) {
    if (_.isString(media_device_id)) {
      return {
        deviceId: {
          exact: media_device_id,
        },
      };
    }
    return true;
  }

  /**
   * Get the MediaStreamConstraints to be used for screen sharing.
   * @returns {Promise} Resolves with MediaStreamConstraints and their type
   */
  get_screen_stream_constraints() {
    if (window.desktopCapturer) {
      this.logger.info('Enabling screen sharing from Electron');

      const constraints = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: this.current_device_id.screen_input(),
            maxHeight: 720,
            maxWidth: 1280,
            minHeight: 720,
            minWidth: 1280,
          },
        },
      };

      return Promise.resolve({media_stream_constraints: constraints, media_type: z.media.MediaType.SCREEN});
    }

    if (z.util.Environment.browser.firefox) {
      this.logger.info('Enabling screen sharing from Firefox');

      const constraints = {
        audio: false,
        video: {
          mediaSource: 'screen',
        },
      };

      return Promise.resolve({media_stream_constraints: constraints, media_type: z.media.MediaType.SCREEN});
    }

    return Promise.reject(new z.media.MediaError(z.media.MediaError.TYPE.SCREEN_NOT_SUPPORTED));
  }

  /**
   * Get the video constraints to be used for MediaStream creation.
   *
   * @private
   * @param {string} media_device_id - Optional ID of MediaDevice to be used
   * @returns {Object} Video stream constraints
   */
  _get_video_stream_constraints(media_device_id) {
    const media_stream_constraints = {
      facingMode: 'user',
      frameRate: 30,
      height: {
        ideal: 360,
        max: 720,
        min: 360,
      },
      width: {
        ideal: 640,
        max: 1280,
        min: 640,
      },
    };

    if (_.isString(media_device_id)) {
      media_stream_constraints.deviceId =
        {exact: media_device_id};
    }

    return media_stream_constraints;
  }


  //##############################################################################
  // Local MediaStream handling
  //##############################################################################

  /**
   * Initiate the MediaStream.
   *
   * @param {string} conversation_id - Conversation ID of call
   * @param {boolean} [video_send=false] - Should MediaStream contain video
   * @returns {Promise} Resolves when the MediaStream has been initiated
   */
  initiate_media_stream(conversation_id, video_send = false) {
    return this.media_repository.devices_handler.update_current_devices(video_send)
    .then(() => {
      return this.get_media_stream_constraints(true, video_send);
    })
    .then(({media_type, media_stream_constraints}) => {
      return this.request_media_stream(media_type, media_stream_constraints);
    })
    .then((media_stream_info) => {
      this.self_stream_state.video_send(video_send);
      if (video_send) {
        this.local_media_type(z.media.MediaType.VIDEO);
      }
      return this._initiate_media_stream_success(media_stream_info);
    })
    .catch((error) => {
      if (error.media_type) {
        this._initiate_media_stream_failure(error, conversation_id);
      }
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CALLING.FAILED_REQUESTING_MEDIA, {cause: error.name || error.message, video: video_send});
      throw error;
    });
  }

  /**
   * Release the local MediaStream.
   * @returns {undefined} Not return value
   */
  release_media_stream() {
    if (this._release_media_stream(this.local_media_stream())) {
      this.local_media_stream(undefined);
    }
  }

  /**
   * Replace the MediaStream after a change of the selected input device.
   * @param {z.media.MediaStreamInfo} media_stream_info - Info about new MediaStream
   * @returns {Promise} Resolves when the MediaStream has been replaced
   */
  replace_media_stream(media_stream_info) {
    const {stream: media_stream} = media_stream_info;
    this.logger.debug(`Received new MediaStream with '${media_stream.getTracks().length}' MediaStreamTrack(s)`,
      {audio_tracks: media_stream.getAudioTracks(), stream: media_stream, video_tracks: media_stream.getVideoTracks()});

    let update_promise;
    if (this.joined_call()) {
      this._set_stream_state(media_stream_info);
      update_promise = Promise.all(this.joined_call()
        .get_flows()
        .map((flow_et) => flow_et.update_media_stream(media_stream_info))
      );
    } else {
      update_promise = Promise.resolve(media_stream_info);
    }

    return update_promise.then(([update_media_stream_info]) => {
      this._set_stream_state(update_media_stream_info);
      this._release_media_stream(this.local_media_stream());
      this.local_media_stream(update_media_stream_info.stream);
    });
  }

  /**
   * Update the used MediaStream after a new input device was selected.
   * @param {z.media.MediaType} input_media_type - Media type of device that was replaced
   * @returns {Promise} Resolves when the input source has been replaced
   */
  replace_input_source(input_media_type) {
    let constraints_promise;
    switch (input_media_type) {
      case z.media.MediaType.AUDIO:
        constraints_promise = this.get_media_stream_constraints(true, false);
        break;
      case z.media.MediaType.SCREEN:
        constraints_promise = this.get_screen_stream_constraints();
        break;
      case z.media.MediaType.VIDEO:
        constraints_promise = this.get_media_stream_constraints(false, true);
        break;
      default:
        throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
    }

    return constraints_promise.then(({media_type, media_stream_constraints}) => {
      return this.request_media_stream(media_type, media_stream_constraints)
      .then((media_stream_info) => {
        this._set_self_stream_state(media_type);
        return this.replace_media_stream(media_stream_info);
      });
    })
    .catch((error) => {
      if (error.media_type === z.media.MediaType.SCREEN) {
        return this.logger.error(`Failed to enable screen sharing: ${error.message}`, error);
      }

      this.logger.error(`Failed to replace '${error.media_type}' input source: ${error.message}`, error);
    });
  }

  /**
   * Request a MediaStream.
   *
   * @param {z.media.MediaType} media_type - Type of MediaStream to be requested
   * @param {RTCMediaStreamConstraints} media_stream_constraints - Constraints for the MediaStream to be requested
   * @returns {Promise} Resolves with the stream and its type
   */
  request_media_stream(media_type, media_stream_constraints) {
    if (!this.media_repository.devices_handler.has_microphone()) {
      return Promise.reject(new z.media.MediaError(z.media.MediaError.TYPE.MEDIA_STREAM_DEVICE, z.media.MediaType.VIDEO));
    }
    if (!this.media_repository.devices_handler.has_camera() && (media_type === z.media.MediaType.VIDEO)) {
      return Promise.reject(new z.media.MediaError(z.media.MediaError.TYPE.MEDIA_STREAM_DEVICE, z.media.MediaType.VIDEO));
    }

    this.logger.info(`Requesting MediaStream access for '${media_type}'`, media_stream_constraints);
    this.request_hint_timeout = window.setTimeout(() => {
      this._hide_permission_failed_hint(media_type);
      this._show_permission_request_hint(media_type);
      this.request_hint_timeout = undefined;
    },
    200);

    return navigator.mediaDevices.getUserMedia(media_stream_constraints)
    .then((media_stream) => {
      this._clear_permission_request_hint(media_type);
      return new z.media.MediaStreamInfo(z.media.MediaStreamSource.LOCAL, 'self', media_stream);
    })
    .catch((error) => {
      this.logger.warn(`MediaStream request failed: ${error.name} ${error.message}`);
      this._clear_permission_request_hint(media_type);
      if (z.calling.rtc.MEDIA_STREAM_ERROR_TYPES.DEVICE.includes(error.name)) {
        throw new z.media.MediaError(z.media.MediaError.TYPE.MEDIA_STREAM_DEVICE, media_type);
      }
      if (z.calling.rtc.MEDIA_STREAM_ERROR_TYPES.MISC.includes(error.name)) {
        throw new z.media.MediaError(z.media.MediaError.TYPE.MEDIA_STREAM_MISC, media_type);
      }
      if (z.calling.rtc.MEDIA_STREAM_ERROR_TYPES.PERMISSION.includes(error.name)) {
        throw new z.media.MediaError(z.media.MediaError.TYPE.MEDIA_STREAM_PERMISSION, media_type);
      }
      throw error;
    });
  }

  /**
   * Clear the permission request hint timeout or hide the warning.
   *
   * @private
   * @param {z.media.MediaType} media_type - Type of requested stream
   * @returns {undefined} No return value
   */
  _clear_permission_request_hint(media_type) {
    if (this.request_hint_timeout) {
      return window.clearTimeout(this.request_hint_timeout);
    }
    this._hide_permission_request_hint(media_type);
  }

  /**
   * Hide the permission denied hint banner.
   *
   * @private
   * @param {z.media.MediaType} media_type - Type of requested stream
   * @returns {undefined} No return value
   */
  _hide_permission_failed_hint(media_type) {
    switch (media_type) {
      case z.media.MediaType.AUDIO:
        amplify.publish(z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.DENIED_MICROPHONE);
        break;
      case z.media.MediaType.SCREEN:
        amplify.publish(z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.DENIED_SCREEN);
        break;
      case z.media.MediaType.VIDEO:
        amplify.publish(z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.DENIED_CAMERA);
        break;
      default:
        throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
    }
  }

  /**
   * Hide the permission request hint banner.
   *
   * @private
   * @param {z.media.MediaType} media_type - Type of requested stream
   * @returns {undefined} No return value
   */
  _hide_permission_request_hint(media_type) {
    if (z.util.Environment.electron) return;

    switch (media_type) {
      case z.media.MediaType.AUDIO:
        amplify.publish(z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.REQUEST_MICROPHONE);
        break;
      case z.media.MediaType.SCREEN:
        amplify.publish(z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.REQUEST_SCREEN);
        break;
      case z.media.MediaType.VIDEO:
        amplify.publish(z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.REQUEST_CAMERA);
        break;
      default:
        throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
    }
  }

  /**
   * Initial request for local MediaStream was successful.
   *
   * @private
   * @param {z.media.MediaStreamInfo} media_stream_info - Type of requested MediaStream
   * @returns {undefined} No return value
   */
  _initiate_media_stream_success(media_stream_info) {
    if (media_stream_info) {
      const {stream: media_stream} = media_stream_info;

      this.logger.debug(`Received initial MediaStream with '${media_stream.getTracks().length}' MediaStreamTrack(s)`,
        {audio_tracks: media_stream.getAudioTracks(), stream: media_stream, video_tracks: media_stream.getVideoTracks()});
      this._set_stream_state(media_stream_info);
      this.local_media_stream(media_stream);
    }
  }

  /**
   * Local MediaStream creation failed.
   *
   * @private
   * @param {z.media.MediaError} error - MediaError
   * @param {string} conversation_id - Conversation ID
   * @returns {undefined} No return value
   */
  _initiate_media_stream_failure(error, conversation_id) {
    const {type: error_type, media_type: error_media_type} = error;

    if (error_type === z.media.MediaError.TYPE.MEDIA_STREAM_DEVICE) {
      return this._show_device_not_found_hint(error_media_type, conversation_id);
    }

    if (error_type === z.media.MediaError.TYPE.MEDIA_STREAM_PERMISSION) {
      return this._show_permission_denied_hint(error_media_type);
    }

    this._show_permission_denied_hint(error_media_type);
  }

  /**
   * Release the MediaStream.
   *
   * @private
   * @param {MediaStream} media_stream - MediaStream to be released
   * @param {z.media.MediaType} [media_type=z.media.MediaType.AUDIO_VIDEO] - Type of MediaStreamTracks to be released
   * @returns {boolean} Have tracks been stopped
   */
  _release_media_stream(media_stream, media_type = z.media.MediaType.AUDIO_VIDEO) {
    if (media_stream) {
      const media_stream_tracks = z.media.MediaStreamHandler.get_media_tracks(media_stream, media_type);

      if (media_stream_tracks.length) {
        media_stream_tracks.forEach((media_stream_track) => {
          media_stream.removeTrack(media_stream_track);
          media_stream_track.stop();
          this.logger.info(`Stopping MediaStreamTrack of kind '${media_stream_track.kind}' successful`, media_stream_track);
        });
        return true;
      }
      this.logger.warn('No MediaStreamTrack found to stop', media_stream);
      return false;
    }
    return false;
  }

  /**
   * Show microphone not found hint banner.
   *
   * @private
   * @param {z.media.MediaType} media_type - Type of device not found
   * @param {string} conversation_id - Optional conversation ID
   * @returns {undefined} No return value
   */
  _show_device_not_found_hint(media_type, conversation_id) {
    if (media_type === z.media.MediaType.AUDIO) {
      amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.NOT_FOUND_MICROPHONE);
    } else if (media_type === z.media.MediaType.VIDEO) {
      amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.NOT_FOUND_CAMERA);
    }

    if (conversation_id) amplify.publish(z.event.WebApp.CALL.STATE.REJECT, conversation_id);
  }

  /**
   * Show permission denied hint banner.
   *
   * @private
   * @param {z.media.MediaType} media_type - Type of media access request
   * @returns {undefined} No return value
   */
  _show_permission_denied_hint(media_type) {
    switch (media_type) {
      case z.media.MediaType.AUDIO:
        amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.DENIED_MICROPHONE);
        break;
      case z.media.MediaType.SCREEN:
        amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.DENIED_SCREEN);
        break;
      case z.media.MediaType.VIDEO:
        amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.DENIED_CAMERA);
        break;
      default:
        throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
    }
  }

  /**
   * Show permission request hint banner.
   *
   * @private
   * @param {z.media.MediaType} media_type - Type of requested MediaStream
   * @returns {undefined} No return value
   */
  _show_permission_request_hint(media_type) {
    if (z.util.Environment.electron) return;

    switch (media_type) {
      case z.media.MediaType.AUDIO:
        amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.REQUEST_MICROPHONE);
        break;
      case z.media.MediaType.SCREEN:
        amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.REQUEST_SCREEN);
        break;
      case z.media.MediaType.VIDEO:
        amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.REQUEST_CAMERA);
        break;
      default:
        throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
    }
  }


  //##############################################################################
  // Remote MediaStream handling
  //##############################################################################

  /**
   * Add a remote MediaStream.
   * @param {z.media.MediaStreamInfo} media_stream_info - MediaStream information
   * @returns {undefined} No return value
   */
  add_remote_media_stream(media_stream_info) {
    const {stream: media_stream, type: media_type} = media_stream_info;

    switch (media_type) {
      case z.media.MediaType.AUDIO:
        this.remote_media_streams.audio.push(media_stream);
        break;
      case z.media.MediaType.AUDIO_VIDEO:
      case z.media.MediaType.VIDEO:
        this.remote_media_streams.video(media_stream);
        break;
      default:
        throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
    }

    this.media_repository.element_handler.add_media_element(media_stream_info);
  }


  //##############################################################################
  // Media handling
  //##############################################################################

  /**
   * Check for active calls that need a MediaStream.
   * @returns {boolean} Returns true if an active media stream is needed for at least one call
   */
  needs_media_stream() {
    for (const call_et of this.calls()) {
      const is_incoming_video_call = call_et.is_remote_video_send() && call_et.state() === z.calling.enum.CALL_STATE.INCOMING;

      if ((call_et.self_client_joined()) || is_incoming_video_call) {
        return true;
      }
    }

    return false;
  }

  // Toggle the camera.
  toggle_video_send() {
    if (this.local_media_stream() && this.local_media_type() === z.media.MediaType.VIDEO) {
      return this._toggle_video_send();
    }
    return this.replace_input_source(z.media.MediaType.VIDEO);
  }

  // Toggle the mute state of the microphone.
  toggle_audio_send() {
    if (this.local_media_stream()) {
      return this._toggle_audio_send();
    }
    return Promise.reject(new z.media.MediaError(z.media.MediaError.TYPE.NO_AUDIO_STREAM_FOUND));
  }

  // Toggle the screen.
  toggle_screen_send() {
    if (this.local_media_stream() && this.local_media_type() === z.media.MediaType.SCREEN) {
      return this._toggle_screen_send();
    }
    return this.replace_input_source(z.media.MediaType.SCREEN);
  }

  // Reset the enabled states of media types.
  reset_self_states() {
    this.self_stream_state.audio_send(true);
    this.self_stream_state.screen_send(false);
    this.self_stream_state.video_send(false);
    this.local_media_type(z.media.MediaType.AUDIO);
  }

  // Reset the MediaStream and states.
  reset_media_stream() {
    if (!this.needs_media_stream()) {
      this.release_media_stream();
      this.reset_self_states();
      this.media_repository.close_audio_context();
    }
  }

  /**
   * Set the self stream state to reflect current media type.
   * @param {z.media.MediaType} media_type - Type of state to enable
   * @returns {undefined} No return value
   */
  _set_self_stream_state(media_type) {
    switch (media_type) {
      case z.media.MediaType.AUDIO:
        this.self_stream_state.audio_send(true);
        break;
      case z.media.MediaType.SCREEN:
        this.self_stream_state.video_send(false);
        this.self_stream_state.screen_send(true);
        this.local_media_type(z.media.MediaType.SCREEN);
        break;
      case z.media.MediaType.VIDEO:
        this.self_stream_state.video_send(true);
        this.self_stream_state.screen_send(false);
        this.local_media_type(z.media.MediaType.VIDEO);
        break;
      default:
        throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
    }
  }

  /**
   * Set the enabled state of a new MediaStream.
   * @private
   * @param {z.media.MediaStreamInfo} media_stream_info - Info about MediaStream to set state off
   * @returns {undefined} No return value
   */
  _set_stream_state(media_stream_info) {
    if ([z.media.MediaType.AUDIO, z.media.MediaType.AUDIO_VIDEO].includes(media_stream_info.type)) {
      const audio_stream_tracks = z.media.MediaStreamHandler.get_media_tracks(media_stream_info.stream, z.media.MediaType.AUDIO);
      audio_stream_tracks[0].enabled = this.self_stream_state.audio_send();
    }

    if ([z.media.MediaType.AUDIO_VIDEO, z.media.MediaType.VIDEO].includes(media_stream_info.type)) {
      const video_stream_tracks = z.media.MediaStreamHandler.get_media_tracks(media_stream_info.stream, z.media.MediaType.VIDEO);
      video_stream_tracks[0].enabled = this.self_stream_state.screen_send() || this.self_stream_state.video_send();
    }
  }

  /**
   * Toggle the audio stream.
   * @private
   * @returns {Promise} Resolve when the stream has been toggled
   */
  _toggle_audio_send() {
    return this._toggle_stream_enabled(z.media.MediaType.AUDIO, this.local_media_stream(), this.self_stream_state.audio_send)
    .then((audio_tracks) => {
      this.logger.info(`Microphone enabled: ${this.self_stream_state.audio_send()}`, audio_tracks);
      this.self_stream_state.audio_send();
    });
  }

  /**
   * Toggle the screen stream.
   * @private
   * @returns {Promise} Resolve when the stream has been toggled
   */
  _toggle_screen_send() {
    return this._toggle_stream_enabled(z.media.MediaType.VIDEO, this.local_media_stream(), this.self_stream_state.screen_send)
    .then((video_tracks) => {
      this.logger.info(`Screen enabled: ${this.self_stream_state.screen_send()}`, video_tracks);
      this.self_stream_state.screen_send();
    });
  }

  /**
   * Toggle the video stream.
   * @private
   * @returns {Promise} Resolve when the stream has been toggled
   */
  _toggle_video_send() {
    return this._toggle_stream_enabled(z.media.MediaType.VIDEO, this.local_media_stream(), this.self_stream_state.video_send)
    .then((video_tracks) => {
      this.logger.info(`Camera enabled: ${this.self_stream_state.video_send()}`, video_tracks);
      this.self_stream_state.video_send();
    });
  }

  /**
   * Toggle the enabled state of a MediaStream.
   *
   * @private
   * @param {z.media.MediaType} media_type - Media type to toggle
   * @param {MediaStream} media_stream - MediaStream to toggle enabled state off
   * @param {ko.observable} state_observable - State observable to invert
   * @returns {Promise} Resolves with MediaStreamTrack with new enabled state
   */
  _toggle_stream_enabled(media_type, media_stream, state_observable) {
    return Promise.resolve()
    .then(function() {
      state_observable(!state_observable());
      if (media_type === z.media.MediaType.AUDIO) {
        amplify.publish(z.event.WebApp.CALL.MEDIA.MUTE_AUDIO, !state_observable());
      }

      const media_stream_tracks = z.media.MediaStreamHandler.get_media_tracks(media_stream, media_type);

      media_stream_tracks.forEach(function(media_stream_track) {
        media_stream_track.enabled = state_observable();
      });

      return media_stream_tracks;
    });
  }
};
