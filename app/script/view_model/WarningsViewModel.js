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

/**
 * Types for warning banners.
 */
z.ViewModel.WarningType = {
  CONNECTIVITY_RECONNECT: 'connectivity_reconnect',
  CONNECTIVITY_RECOVERY: 'connectivity_recovery',
  DENIED_CAMERA: 'camera_access_denied',
  DENIED_MICROPHONE: 'mic_access_denied',
  DENIED_SCREEN: 'screen_access_denied',
  LIFECYCLE_UPDATE: 'lifecycle_update',
  NO_INTERNET: 'no_internet',
  NOT_FOUND_CAMERA: 'not_found_camera',
  NOT_FOUND_MICROPHONE: 'not_found_microphone',
  REQUEST_CAMERA: 'request_camera',
  REQUEST_MICROPHONE: 'request_microphone',
  REQUEST_NOTIFICATION: 'request_notification',
  REQUEST_SCREEN: 'request_screen',
  UNSUPPORTED_INCOMING_CALL: 'unsupported_incoming_call',
  UNSUPPORTED_OUTGOING_CALL: 'unsupported_outgoing_call'
};

z.ViewModel.WarningsViewModel = class WarningsViewModel {
  static get CONFIG() {
    return {
      DIMMED_MODES: [
        z.ViewModel.WarningType.REQUEST_CAMERA,
        z.ViewModel.WarningType.REQUEST_MICROPHONE,
        z.ViewModel.WarningType.REQUEST_NOTIFICATION,
        z.ViewModel.WarningType.REQUEST_SCREEN
      ],
      MINI_MODES: [
        z.ViewModel.WarningType.CONNECTIVITY_RECONNECT,
        z.ViewModel.WarningType.LIFECYCLE_UPDATE,
        z.ViewModel.WarningType.NO_INTERNET
      ]
    };
  }

  constructor(element_id) {
    this.logger = new z.util.Logger(
      'z.ViewModel.WarningsViewModel',
      z.config.LOGGER.OPTIONS
    );

    // Array of warning banners
    this.warnings = ko.observableArray();
    this.top_warning = ko.pureComputed(
      () => {
        return this.warnings()[this.warnings().length - 1];
      },
      this,
      {deferEvaluation: true}
    );

    this.warnings.subscribe(function(warnings) {
      let top_margin;

      const top_warning = warnings[warnings.length - 1];
      if (!warnings.length) {
        top_margin = '0';
      } else if (
        top_warning === z.ViewModel.WarningType.CONNECTIVITY_RECOVERY
      ) {
        top_margin = '0';
      } else if (WarningsViewModel.CONFIG.MINI_MODES.includes(top_warning)) {
        top_margin = '32px';
      } else {
        top_margin = '64px';
      }
      $('#app').css({top: top_margin});
      window.requestAnimationFrame(() => $(window).trigger('resize'));
    });

    this.first_name = ko.observable();
    this.call_id = undefined;

    this.warning_dimmed = ko
      .pureComputed(
        () => {
          for (const warning of this.warnings()) {
            if (WarningsViewModel.CONFIG.DIMMED_MODES.includes(warning)) {
              return true;
            }
          }
          return false;
        },
        this,
        {deferEvaluation: true}
      )
      .extend({rateLimit: 200});

    amplify.subscribe(
      z.event.WebApp.WARNING.SHOW,
      this.show_warning.bind(this)
    );
    amplify.subscribe(
      z.event.WebApp.WARNING.DISMISS,
      this.dismiss_warning.bind(this)
    );

    ko.applyBindings(this, document.getElementById(element_id));
  }

  /**
   * Close warning.
   * @note Used to close a warning banner by clicking the close button
   * @returns {undefined} No return value
   */
  close_warning() {
    const warning_to_remove = this.top_warning();
    this.dismiss_warning(warning_to_remove);

    switch (warning_to_remove) {
      case z.ViewModel.WarningType.REQUEST_MICROPHONE:
        amplify.publish(
          z.event.WebApp.WARNING.MODAL,
          z.ViewModel.ModalType.CALLING,
          {
            action() {
              z.util.safe_window_open(
                z.l10n.text(z.string.url_support_mic_access_denied)
              );
            }
          }
        );
        break;
      case z.ViewModel.WarningType.REQUEST_NOTIFICATION:
        // We block subsequent permission requests for notifications when the user ignores the request.
        amplify.publish(
          z.event.WebApp.SYSTEM_NOTIFICATION.PERMISSION_STATE,
          z.system_notification.PermissionStatusState.IGNORED
        );
        break;
      default:
        break;
    }
  }

  dismiss_warning(type = this.top_warning()) {
    if (type) {
      this.logger.info(`Dismissed warning of type '${type}'`);
      this.warnings.remove(type);
    }
  }

  show_warning(type, info) {
    const is_connectivity_warning = [
      z.ViewModel.WarningType.CONNECTIVITY_RECONNECT,
      z.ViewModel.WarningType.NO_INTERNET
    ].includes(type);
    const top_warning_is_not_lifecycle_update =
      this.top_warning() !== z.ViewModel.WarningType.LIFECYCLE_UPDATE;
    if (is_connectivity_warning && top_warning_is_not_lifecycle_update) {
      this.dismiss_warning(this.top_warning());
    }

    this.logger.warn(`Showing warning of type '${type}'`);
    if (info) {
      this.first_name(info.first_name);
      this.call_id = info.call_id;
    }
    this.warnings.push(type);
  }
};
