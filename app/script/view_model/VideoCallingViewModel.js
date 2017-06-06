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
window.z.ViewModel = z.ViewModel || {};

z.ViewModel.VideoCallingViewModel = class VideoCallingViewModel {
  constructor(
    element_id,
    calling_repository,
    conversation_repository,
    media_repository,
    user_repository,
    multitasking
  ) {
    this.clicked_on_cancel_screen = this.clicked_on_cancel_screen.bind(this);
    this.clicked_on_choose_screen = this.clicked_on_choose_screen.bind(this);
    this.choose_shared_screen = this.choose_shared_screen.bind(this);

    this.calling_repository = calling_repository;
    this.conversation_repository = conversation_repository;
    this.media_repository = media_repository;
    this.user_repository = user_repository;
    this.multitasking = multitasking;
    this.logger = new z.util.Logger(
      'z.ViewModel.VideoCallingViewModel',
      z.config.LOGGER.OPTIONS
    );

    this.self_user = this.user_repository.self;

    this.available_devices = this.media_repository.devices_handler.available_devices;
    this.current_device_id = this.media_repository.devices_handler.current_device_id;
    this.current_device_index = this.media_repository.devices_handler.current_device_index;

    this.local_video_stream = this.media_repository.stream_handler.local_media_stream;
    this.remote_video_stream = this.media_repository.stream_handler.remote_media_streams.video;

    this.self_stream_state = this.media_repository.stream_handler.self_stream_state;

    this.is_choosing_screen = ko.observable(false);

    this.minimize_timeout = undefined;

    this.remote_video_element_contain = ko.observable(false);

    this.number_of_screen_devices = ko.observable(0);
    this.number_of_video_devices = ko.observable(0);

    this.calls = this.calling_repository.calls;
    this.joined_call = this.calling_repository.joined_call;

    this.videod_call = ko.pureComputed(() => {
      for (const call_et of this.calls()) {
        const is_active = z.calling.enum.CALL_STATE_GROUP.IS_ACTIVE.includes(
          call_et.state()
        );
        const self_video_send =
          (call_et.self_client_joined() &&
            this.self_stream_state.screen_send()) ||
          this.self_stream_state.video_send();
        const remote_video_send =
          (call_et.is_remote_screen_send() || call_et.is_remote_video_send()) &&
          !call_et.is_ongoing_on_another_client();
        if (
          is_active &&
          (self_video_send || remote_video_send || this.is_choosing_screen())
        ) {
          return call_et;
        }
      }
    });

    this.is_ongoing = ko.pureComputed(() => {
      if (this.joined_call()) {
        return (
          this.videod_call() &&
          this.joined_call().state() === z.calling.enum.CALL_STATE.ONGOING
        );
      }
    });

    this.overlay_icon_class = ko.pureComputed(() => {
      if (this.is_ongoing()) {
        if (!this.self_stream_state.audio_send()) {
          return 'icon-mute';
        }

        if (
          !this.self_stream_state.screen_send() &&
          !this.self_stream_state.video_send()
        ) {
          return 'icon-video-off';
        }
      }
    });

    this.remote_user = ko.pureComputed(() => {
      if (this.joined_call()) {
        const [participant] = this.joined_call().participants();

        if (participant) {
          return participant.user;
        }
      }
    });

    this.show_local = ko.pureComputed(() => {
      return (
        (this.show_local_video() || this.overlay_icon_class()) &&
        !this.multitasking.is_minimized() &&
        !this.is_choosing_screen()
      );
    });
    this.show_local_video = ko.pureComputed(() => {
      if (this.videod_call()) {
        const is_visible =
          this.self_stream_state.screen_send() ||
          this.self_stream_state.video_send() ||
          this.videod_call().state() !== z.calling.enum.CALL_STATE.ONGOING;
        return is_visible && this.local_video_stream();
      }
    });

    this.show_remote = ko.pureComputed(() => {
      return (
        this.show_remote_video() ||
        this.show_remote_participant() ||
        this.is_choosing_screen()
      );
    });
    this.show_remote_participant = ko.pureComputed(() => {
      const is_visible =
        this.remote_user() &&
        !this.multitasking.is_minimized() &&
        !this.is_choosing_screen();
      return this.is_ongoing() && !this.show_remote_video() && is_visible;
    });
    this.show_remote_video = ko.pureComputed(() => {
      if (this.joined_call()) {
        const is_visible =
          (this.joined_call().is_remote_screen_send() ||
            this.joined_call().is_remote_video_send()) &&
          this.remote_video_stream();
        return this.is_ongoing() && is_visible;
      }
    });

    this.show_switch_camera = ko.pureComputed(() => {
      const is_visible =
        this.local_video_stream() &&
        this.available_devices.video_input().length > 1 &&
        this.self_stream_state.video_send();
      return this.is_ongoing() && is_visible;
    });
    this.show_switch_screen = ko.pureComputed(() => {
      const is_visible =
        this.local_video_stream() &&
        this.available_devices.screen_input().length > 1 &&
        this.self_stream_state.screen_send();
      return this.is_ongoing() && is_visible;
    });

    this.show_controls = ko.pureComputed(() => {
      const is_visible =
        this.show_remote_video() ||
        (this.show_remote_participant() && !this.multitasking.is_minimized());
      return this.is_ongoing() && is_visible;
    });
    this.show_toggle_video = ko.pureComputed(() => {
      if (this.joined_call()) {
        return this.joined_call().conversation_et.is_one2one();
      }
    });
    this.show_toggle_screen = ko.pureComputed(
      () => z.calling.CallingRepository.supports_screen_sharing
    );
    this.disable_toggle_screen = ko.pureComputed(() => {
      if (this.joined_call()) {
        return this.joined_call().is_remote_screen_send();
      }
    });

    this.visible_call_id = undefined;
    this.joined_call.subscribe(joined_call => {
      if (joined_call) {
        if (this.visible_call_id !== joined_call.id) {
          this.visible_call_id = joined_call.id;
          if (this.show_local_video() || this.show_remote_video()) {
            this.multitasking.is_minimized(false);
            return this.logger.info(
              `Maximizing video call '${joined_call.id}' to full-screen`,
              joined_call
            );
          }

          this.multitasking.is_minimized(true);
          this.logger.info(
            `Minimizing audio call '${joined_call.id}' from full-screen`,
            joined_call
          );
        }
      } else {
        this.visible_call_id = undefined;
        this.multitasking.auto_minimize(true);
        this.multitasking.is_minimized(false);
        this.logger.info('Resetting full-screen calling to maximize');
      }
    });

    this.available_devices.screen_input.subscribe(media_devices => {
      if (_.isArray(media_devices)) {
        this.number_of_screen_devices(media_devices.length);
      } else {
        this.number_of_screen_devices(0);
      }
    });
    this.available_devices.video_input.subscribe(media_devices => {
      if (_.isArray(media_devices)) {
        this.number_of_video_devices(media_devices.length);
      } else {
        this.number_of_video_devices(0);
      }
    });
    this.show_remote_participant.subscribe(show_remote_participant => {
      if (this.minimize_timeout) {
        window.clearTimeout(this.minimize_timeout);
        this.minimize_timeout = undefined;
      }

      if (
        show_remote_participant &&
        this.multitasking.auto_minimize() &&
        this.videod_call() &&
        !this.is_choosing_screen()
      ) {
        const remote_user_name = this.remote_user()
          ? this.remote_user().name()
          : undefined;

        this.logger.info(
          `Scheduled minimizing call '${this.videod_call()
            .id}' on timeout as remote user '${remote_user_name}' is not videod`
        );
        this.minimize_timeout = window.setTimeout(() => {
          if (!this.is_choosing_screen()) {
            this.multitasking.is_minimized(true);
          }
          this.logger.info(
            `Minimizing call '${this.videod_call()
              .id}' on timeout as remote user '${remote_user_name}' is not videod`
          );
        }, 4000);
      }
    });

    amplify.subscribe(
      z.event.WebApp.CALL.MEDIA.CHOOSE_SCREEN,
      this.choose_shared_screen
    );

    ko.applyBindings(this, document.getElementById(element_id));
  }

  choose_shared_screen(conversation_id) {
    if (!this.disable_toggle_screen()) {
      if (
        this.self_stream_state.screen_send() ||
        z.util.Environment.browser.firefox
      ) {
        amplify.publish(
          z.event.WebApp.CALL.MEDIA.TOGGLE,
          conversation_id,
          z.media.MediaType.SCREEN
        );
      } else if (z.util.Environment.electron) {
        amplify.publish(
          z.event.WebApp.ANALYTICS.EVENT,
          z.tracking.EventName.CALLING.SHARED_SCREEN,
          {
            conversation_type: this.joined_call().is_group()
              ? z.tracking.attribute.ConversationType.GROUP
              : z.tracking.attribute.ConversationType.ONE_TO_ONE,
            kind_of_call_when_sharing: this.joined_call().is_remote_video_send()
              ? 'video'
              : 'audio'
          }
        );

        this.media_repository.devices_handler
          .get_screen_sources()
          .then(screen_sources => {
            if (screen_sources.length > 1) {
              this.is_choosing_screen(true);
              if (this.multitasking.is_minimized()) {
                this.multitasking.reset_minimize(true);
                this.multitasking.is_minimized(false);
              }
            } else {
              amplify.publish(
                z.event.WebApp.CALL.MEDIA.TOGGLE,
                conversation_id,
                z.media.MediaType.SCREEN
              );
            }
          })
          .catch(error => {
            this.logger.error(
              'Unable to get screens sources for sharing',
              error
            );
          });
      }
    }
  }

  clicked_on_cancel_screen() {
    this.is_choosing_screen(false);
  }

  clicked_on_leave_call() {
    if (this.joined_call()) {
      amplify.publish(
        z.event.WebApp.CALL.STATE.LEAVE,
        this.joined_call().id,
        z.calling.enum.TERMINATION_REASON.SELF_USER
      );
    }
  }

  clicked_on_mute_audio() {
    if (this.joined_call()) {
      amplify.publish(
        z.event.WebApp.CALL.MEDIA.TOGGLE,
        this.joined_call().id,
        z.media.MediaType.AUDIO
      );
    }
  }

  clicked_on_share_screen() {
    if (this.joined_call()) {
      this.choose_shared_screen(this.joined_call().id);
    }
  }

  clicked_on_choose_screen(screen_source) {
    this.current_device_id.screen_input('');

    this.logger.info(
      `Selected '${screen_source.name}' for screen sharing`,
      screen_source
    );
    this.is_choosing_screen(false);
    this.current_device_id.screen_input(screen_source.id);
    amplify.publish(
      z.event.WebApp.CALL.MEDIA.TOGGLE,
      this.joined_call().id,
      z.media.MediaType.SCREEN
    );

    if (this.multitasking.reset_minimize()) {
      this.multitasking.is_minimized(true);
      this.multitasking.reset_minimize(false);
      this.logger.info(
        `Minimizing call '${this.joined_call()
          .id}' on screen selection to return to previous state`
      );
    }
  }

  clicked_on_stop_video() {
    if (this.joined_call()) {
      amplify.publish(
        z.event.WebApp.CALL.MEDIA.TOGGLE,
        this.joined_call().id,
        z.media.MediaType.VIDEO
      );
    }
  }

  clicked_on_toggle_camera() {
    this.media_repository.devices_handler.toggle_next_camera();
  }

  clicked_on_toggle_screen() {
    this.media_repository.devices_handler.toggle_next_screen();
  }

  clicked_on_minimize() {
    this.multitasking.is_minimized(true);
    this.logger.info(
      `Minimizing call '${this.videod_call().id}' on user click`
    );
  }

  clicked_on_maximize() {
    this.multitasking.is_minimized(false);
    this.logger.info(
      `Maximizing call '${this.videod_call().id}' on user click`
    );
  }

  double_clicked_on_remote_video() {
    this.remote_video_element_contain(!this.remote_video_element_contain());
    this.logger.info(
      `Switched remote video object-fit. Contain is '${this.remote_video_element_contain()}'`
    );
  }

  /**
   * Detect the aspect ratio of a MediaElement and set the video mode.
   *
   * @param {VideoCallingViewModel} view_model - Video calling view model
   * @param {HTMLVideoElement} media_element - Media element containing video
   * @returns {undefined} No return value
   */
  on_loadedmetadata(view_model, {target: media_element}) {
    let detected_video_mode;

    if (media_element.videoHeight > media_element.videoWidth) {
      this.remote_video_element_contain(true);
      detected_video_mode = z.calling.enum.VIDEO_ORIENTATION.PORTRAIT;
    } else {
      this.remote_video_element_contain(false);
      detected_video_mode = z.calling.enum.VIDEO_ORIENTATION.LANDSCAPE;
    }
    this.logger.info(`Remote video is in '${detected_video_mode}' mode`);
  }
};

// http://stackoverflow.com/questions/28762211/unable-to-mute-html5-video-tag-in-firefox
ko.bindingHandlers.mute_media_element = {
  update(element, valueAccessor) {
    if (valueAccessor()) {
      element.muted = true;
    }
  }
};

ko.bindingHandlers.source_stream = {
  update(element, valueAccessor) {
    element.srcObject = valueAccessor();
  }
};
