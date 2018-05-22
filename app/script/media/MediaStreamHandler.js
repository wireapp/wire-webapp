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
  static detect_media_stream_type(mediaStream) {
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
  static get_media_tracks(mediaStream, mediaType = z.media.MediaType.AUDIO_VIDEO) {
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

  /**
   * Construct a new MediaStream handler.
   * @param {z.media.MediaRepository} media_repository - Media repository with with references to all other handlers
   */
  constructor(media_repository) {
    this.media_repository = media_repository;
    this.logger = new z.util.Logger('z.media.MediaStreamHandler', z.config.LOGGER.OPTIONS);

    this.calls = () => [];
    this.joined_call = () => undefined;

    this.constraints_handler = this.media_repository.constraints_handler;
    this.devices_handler = this.media_repository.devices_handler;
    this.element_handler = this.media_repository.element_handler;

    this.current_device_id = this.devices_handler.current_device_id;

    this.localMediaStream = ko.observable();
    this.local_media_type = ko.observable(z.media.MediaType.AUDIO);

    this.remote_media_streams = {
      audio: ko.observableArray([]),
      video: ko.observableArray([]),
    };

    this.selfStreamState = {
      audioSend: ko.observable(true),
      screenSend: ko.observable(false),
      videoSend: ko.observable(false),
    };

    this.request_hint_timeout = undefined;
    amplify.subscribe(z.event.WebApp.CALL.MEDIA.ADD_STREAM, this.addRemoteMediaStream.bind(this));
    amplify.subscribe(z.event.WebApp.CALL.MEDIA.REMOVE_STREAM, this.removeRemoteMediaStreams.bind(this));
  }

  //##############################################################################
  // Local MediaStream handling
  //##############################################################################

  /**
   * Initiate the MediaStream.
   *
   * @param {string} conversation_id - Conversation ID of call
   * @param {z.media.MediaType} [media_type=z.media.MediaType.AUDIO] - Media type for this call
   * @param {boolean} [isGroup=false] - Set constraints for group
   * @returns {Promise} Resolves when the MediaStream has been initiated
   */
  initiate_media_stream(conversation_id, media_type = z.media.MediaType.AUDIO, isGroup = false) {
    const video_send = media_type === z.media.MediaType.AUDIO_VIDEO;

    return this.devices_handler
      .update_current_devices(video_send)
      .then(() => this.constraints_handler.get_media_stream_constraints(true, video_send, isGroup))
      .then(({streamConstraints}) => this.request_media_stream(media_type, streamConstraints))
      .then(media_stream_info => {
        this.selfStreamState.videoSend(video_send);
        if (video_send) {
          this.local_media_type(z.media.MediaType.VIDEO);
        }
        return this._initiate_media_stream_success(media_stream_info);
      })
      .catch(error => {
        if (error.media_type) {
          this._initiate_media_stream_failure(error, conversation_id);
        }
        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CALLING.FAILED_REQUESTING_MEDIA, {
          cause: error.name || error.message,
          video: video_send,
        });
        throw error;
      });
  }

  /**
   * Release the local MediaStream.
   * @returns {undefined} Not return value
   */
  release_media_stream() {
    if (this._release_media_stream(this.localMediaStream())) {
      this.localMediaStream(undefined);
    }
  }

  /**
   * Replace the MediaStream after a change of the selected input device.
   * @param {z.media.MediaStreamInfo} media_stream_info - Info about new MediaStream
   * @returns {Promise} Resolves when the MediaStream has been replaced
   */
  replace_media_stream(media_stream_info) {
    const {stream: media_stream, type} = media_stream_info;
    this.logger.debug(`Received new MediaStream with '${media_stream.getTracks().length}' MediaStreamTrack(s)`, {
      audio_tracks: media_stream.getAudioTracks(),
      stream: media_stream,
      video_tracks: media_stream.getVideoTracks(),
    });

    let update_promise;
    if (this.joined_call()) {
      this._set_stream_state(media_stream_info);
      const flowEntities = this.joined_call().getFlows();
      update_promise = Promise.all(flowEntities.map(flow_et => flow_et.updateMediaStream(media_stream_info)));
    } else {
      update_promise = Promise.resolve([media_stream_info]);
    }

    return update_promise.then(([update_media_stream_info]) => {
      const media_type = !update_media_stream_info.replaced ? type : undefined;

      this._set_stream_state(update_media_stream_info);
      this._release_media_stream(this.localMediaStream(), media_type);
      this.localMediaStream(update_media_stream_info.stream);
    });
  }

  /**
   * Update the used MediaStream after a new input device was selected.
   * @param {z.media.MediaType} input_media_type - Media type of device that was replaced
   * @returns {Promise} Resolves when the input source has been replaced
   */
  replace_input_source(input_media_type) {
    const is_preference_change = !this.needs_media_stream();

    let constraints_promise;
    switch (input_media_type) {
      case z.media.MediaType.AUDIO:
        constraints_promise = this.constraints_handler.get_media_stream_constraints(true, is_preference_change);
        break;
      case z.media.MediaType.SCREEN:
        constraints_promise = this.constraints_handler.get_screen_stream_constraints();
        break;
      case z.media.MediaType.VIDEO:
        constraints_promise = this.constraints_handler.get_media_stream_constraints(is_preference_change, true);
        break;
      default:
        throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
    }

    return constraints_promise
      .then(({mediaType, streamConstraints}) => {
        return this.request_media_stream(mediaType, streamConstraints).then(media_stream_info => {
          this._set_self_stream_state(mediaType);
          return this.replace_media_stream(media_stream_info);
        });
      })
      .catch(error => {
        if (input_media_type === z.media.MediaType.SCREEN) {
          return this.logger.error(`Failed to enable screen sharing: ${error.message}`, error);
        }

        this.logger.error(`Failed to replace '${input_media_type}' input source: ${error.message}`, error);
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
    const audioTypes = [z.media.MediaType.AUDIO, z.media.MediaType.AUDIO_VIDEO];
    const noAudioDevice = !this.devices_handler.has_microphone() && audioTypes.includes(media_type);
    if (noAudioDevice) {
      const mediaError = new z.media.MediaError(z.media.MediaError.TYPE.MEDIA_STREAM_DEVICE, z.media.MediaType.AUDIO);
      return Promise.reject(mediaError);
    }

    const videoTypes = [z.media.MediaType.AUDIO_VIDEO, z.media.MediaType.VIDEO];
    const noVideoTypes = !this.devices_handler.has_camera() && videoTypes.includes(media_type);
    if (noVideoTypes) {
      const mediaError = new z.media.MediaError(z.media.MediaError.TYPE.MEDIA_STREAM_DEVICE, z.media.MediaType.VIDEO);
      return Promise.reject(mediaError);
    }

    this.logger.info(`Requesting MediaStream access for '${media_type}'`, media_stream_constraints);
    this.request_hint_timeout = window.setTimeout(() => {
      this._hide_permission_failed_hint(media_type);
      this._show_permission_request_hint(media_type);
      this.request_hint_timeout = undefined;
    }, 200);

    return navigator.mediaDevices
      .getUserMedia(media_stream_constraints)
      .then(media_stream => {
        this._clear_permission_request_hint(media_type);
        return new z.media.MediaStreamInfo(z.media.MediaStreamSource.LOCAL, 'self', media_stream);
      })
      .catch(error => {
        const {message, name} = error;
        this.logger.warn(`MediaStream request for '${media_type}' failed: ${name} ${message}`);
        this._clear_permission_request_hint(media_type);

        if (z.media.MEDIA_STREAM_ERROR_TYPES.DEVICE.includes(name)) {
          throw new z.media.MediaError(z.media.MediaError.TYPE.MEDIA_STREAM_DEVICE, media_type);
        }

        if (z.media.MEDIA_STREAM_ERROR_TYPES.MISC.includes(name)) {
          throw new z.media.MediaError(z.media.MediaError.TYPE.MEDIA_STREAM_MISC, media_type);
        }

        if (z.media.MEDIA_STREAM_ERROR_TYPES.PERMISSION.includes(name)) {
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
        amplify.publish(z.event.WebApp.WARNING.DISMISS, z.viewModel.WarningsViewModel.TYPE.DENIED_MICROPHONE);
        break;
      case z.media.MediaType.SCREEN:
        amplify.publish(z.event.WebApp.WARNING.DISMISS, z.viewModel.WarningsViewModel.TYPE.DENIED_SCREEN);
        break;
      case z.media.MediaType.AUDIO_VIDEO:
      case z.media.MediaType.VIDEO:
        amplify.publish(z.event.WebApp.WARNING.DISMISS, z.viewModel.WarningsViewModel.TYPE.DENIED_CAMERA);
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
    if (z.util.Environment.electron) {
      return;
    }

    switch (media_type) {
      case z.media.MediaType.AUDIO:
        amplify.publish(z.event.WebApp.WARNING.DISMISS, z.viewModel.WarningsViewModel.TYPE.REQUEST_MICROPHONE);
        break;
      case z.media.MediaType.SCREEN:
        amplify.publish(z.event.WebApp.WARNING.DISMISS, z.viewModel.WarningsViewModel.TYPE.REQUEST_SCREEN);
        break;
      case z.media.MediaType.AUDIO_VIDEO:
      case z.media.MediaType.VIDEO:
        amplify.publish(z.event.WebApp.WARNING.DISMISS, z.viewModel.WarningsViewModel.TYPE.REQUEST_CAMERA);
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

      this.logger.debug(`Received initial MediaStream with '${media_stream.getTracks().length}' MediaStreamTrack(s)`, {
        audio_tracks: media_stream.getAudioTracks(),
        stream: media_stream,
        video_tracks: media_stream.getVideoTracks(),
      });
      this._set_stream_state(media_stream_info);
      this.localMediaStream(media_stream);
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
        media_stream_tracks.forEach(media_stream_track => {
          media_stream.removeTrack(media_stream_track);
          media_stream_track.stop();
          this.logger.info(
            `Stopping MediaStreamTrack of kind '${media_stream_track.kind}' successful`,
            media_stream_track
          );
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
      amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.NOT_FOUND_MICROPHONE);
    } else if (media_type === z.media.MediaType.VIDEO) {
      amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.NOT_FOUND_CAMERA);
    }

    if (conversation_id) {
      amplify.publish(z.event.WebApp.CALL.STATE.REJECT, conversation_id);
    }
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
        amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.DENIED_MICROPHONE);
        break;
      case z.media.MediaType.SCREEN:
        amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.DENIED_SCREEN);
        break;
      case z.media.MediaType.AUDIO_VIDEO:
      case z.media.MediaType.VIDEO:
        amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.DENIED_CAMERA);
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
    if (z.util.Environment.electron) {
      return;
    }

    switch (media_type) {
      case z.media.MediaType.AUDIO:
        amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.REQUEST_MICROPHONE);
        break;
      case z.media.MediaType.SCREEN:
        amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.REQUEST_SCREEN);
        break;
      case z.media.MediaType.AUDIO_VIDEO:
      case z.media.MediaType.VIDEO:
        amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.REQUEST_CAMERA);
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
   * @param {z.media.MediaStreamInfo} mediaStreamInfo - MediaStream information
   * @returns {undefined} No return value
   */
  addRemoteMediaStream(mediaStreamInfo) {
    const {stream: mediaStream, type: mediaType} = mediaStreamInfo;

    switch (mediaType) {
      case z.media.MediaType.AUDIO: {
        this.remote_media_streams.audio.push(mediaStream);
        break;
      }

      case z.media.MediaType.AUDIO_VIDEO:
      case z.media.MediaType.VIDEO: {
        this.remote_media_streams.video.push(mediaStream);
        break;
      }

      default: {
        throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
      }
    }

    this.element_handler.add_media_element(mediaStreamInfo);
  }

  removeRemoteMediaStreams(streams) {
    const streamIds = streams.map(stream => stream.id);
    this.remote_media_streams.video.remove(stream => streamIds.includes(stream.id));
    this.remote_media_streams.audio.remove(stream => streamIds.includes(stream.id));
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
      const is_incoming_video_call =
        call_et.isRemoteVideoSend() && call_et.state() === z.calling.enum.CALL_STATE.INCOMING;

      if (call_et.selfClientJoined() || is_incoming_video_call) {
        return true;
      }
    }

    return false;
  }

  // Toggle the camera.
  toggle_video_send() {
    const hasActiveVideoStream = this.localMediaStream() && this.local_media_type() === z.media.MediaType.VIDEO;
    return hasActiveVideoStream ? this._toggle_video_send() : this.replace_input_source(z.media.MediaType.VIDEO);
  }

  // Toggle the mute state of the microphone.
  toggle_audio_send() {
    const hasActiveAudioStream = !!this.localMediaStream();
    return hasActiveAudioStream
      ? this._toggleAudioSend()
      : Promise.reject(new z.media.MediaError(z.media.MediaError.TYPE.NO_AUDIO_STREAM_FOUND));
  }

  // Toggle the screen.
  toggle_screen_send() {
    const hasActiveScreenStream = this.localMediaStream() && this.local_media_type() === z.media.MediaType.SCREEN;
    return hasActiveScreenStream ? this._toggleScreenSend() : this.replace_input_source(z.media.MediaType.SCREEN);
  }

  // Reset the enabled states of media types.
  reset_self_states() {
    this.selfStreamState.audioSend(true);
    this.selfStreamState.screenSend(false);
    this.selfStreamState.videoSend(false);
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
   * @param {z.media.MediaType} mediaType - Type of state to enable
   * @returns {undefined} No return value
   */
  _set_self_stream_state(mediaType) {
    switch (mediaType) {
      case z.media.MediaType.AUDIO: {
        this.selfStreamState.audioSend(true);
        break;
      }

      case z.media.MediaType.SCREEN: {
        this.selfStreamState.videoSend(false);
        this.selfStreamState.screenSend(true);
        this.local_media_type(z.media.MediaType.SCREEN);
        break;
      }

      case z.media.MediaType.VIDEO: {
        this.selfStreamState.videoSend(true);
        this.selfStreamState.screenSend(false);
        this.local_media_type(z.media.MediaType.VIDEO);
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
   * @param {z.media.MediaStreamInfo} media_stream_info - Info about MediaStream to set state off
   * @returns {undefined} No return value
   */
  _set_stream_state(media_stream_info) {
    if ([z.media.MediaType.AUDIO, z.media.MediaType.AUDIO_VIDEO].includes(media_stream_info.type)) {
      const [audio_stream_track] = z.media.MediaStreamHandler.get_media_tracks(
        media_stream_info.stream,
        z.media.MediaType.AUDIO
      );
      audio_stream_track.enabled = this.selfStreamState.audioSend();
    }

    if ([z.media.MediaType.AUDIO_VIDEO, z.media.MediaType.VIDEO].includes(media_stream_info.type)) {
      const [video_stream_track] = z.media.MediaStreamHandler.get_media_tracks(
        media_stream_info.stream,
        z.media.MediaType.VIDEO
      );
      video_stream_track.enabled = this.selfStreamState.screenSend() || this.selfStreamState.videoSend();
    }
  }

  /**
   * Toggle the audio stream.
   * @private
   * @returns {Promise} Resolve when the stream has been toggled
   */
  _toggleAudioSend() {
    const mediaType = z.media.MediaType.AUDIO;
    const stateObservable = this.selfStreamState.audioSend;

    return this._toggleStreamEnabled(mediaType, this.localMediaStream(), stateObservable).then(audioTracks => {
      this.logger.info(`Microphone enabled: ${stateObservable()}`, audioTracks);
      return stateObservable();
    });
  }

  /**
   * Toggle the screen stream.
   * @private
   * @returns {Promise} Resolve when the stream has been toggled
   */
  _toggleScreenSend() {
    const mediaType = z.media.MediaType.VIDEO;
    const stateObservable = this.selfStreamState.screenSend;

    return this._toggleStreamEnabled(mediaType, this.localMediaStream(), stateObservable).then(videoTracks => {
      this.logger.info(`Screen enabled: ${stateObservable()}`, videoTracks);
      return stateObservable();
    });
  }

  /**
   * Toggle the video stream.
   * @private
   * @returns {Promise} Resolve when the stream has been toggled
   */
  _toggle_video_send() {
    const mediaType = z.media.MediaType.VIDEO;
    const stateObservable = this.selfStreamState.videoSend;

    return this._toggleStreamEnabled(mediaType, this.localMediaStream(), stateObservable).then(videoTracks => {
      this.logger.info(`Camera enabled: ${stateObservable()}`, videoTracks);
      return stateObservable();
    });
  }

  /**
   * Toggle the enabled state of a MediaStream.
   *
   * @private
   * @param {z.media.MediaType} mediaType - Media type to toggle
   * @param {MediaStream} mediaStream - MediaStream to toggle enabled state off
   * @param {ko.observable} stateObservable - State observable to invert
   * @returns {Promise} Resolves with MediaStreamTrack with new enabled state
   */
  _toggleStreamEnabled(mediaType, mediaStream, stateObservable) {
    return Promise.resolve().then(() => {
      stateObservable(!stateObservable());
      const isTypeAudio = mediaType === z.media.MediaType.AUDIO;
      if (isTypeAudio) {
        amplify.publish(z.event.WebApp.CALL.MEDIA.MUTE_AUDIO, !stateObservable());
      }

      const mediaStreamTracks = z.media.MediaStreamHandler.get_media_tracks(mediaStream, mediaType);
      mediaStreamTracks.forEach(mediaStreamTrack => (mediaStreamTrack.enabled = stateObservable()));
      return mediaStreamTracks;
    });
  }
};
