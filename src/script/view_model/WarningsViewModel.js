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
import {t} from 'Util/LocalizerUtil';
import {Environment} from 'Util/Environment';
import {safeWindowOpen} from 'Util/SanitizationUtil';
import {buildSupportUrl} from 'Util/UrlUtil';
import {afterRender} from 'Util/util';

import {Config} from '../Config';
import {ModalsViewModel} from './ModalsViewModel';
import {PermissionState} from '../notification/PermissionState';
import {WebAppEvents} from '../event/WebApp';

export class WarningsViewModel {
  static get CONFIG() {
    return {
      DIMMED_MODES: [
        WarningsViewModel.TYPE.REQUEST_CAMERA,
        WarningsViewModel.TYPE.REQUEST_MICROPHONE,
        WarningsViewModel.TYPE.REQUEST_NOTIFICATION,
        WarningsViewModel.TYPE.REQUEST_SCREEN,
      ],
      MINI_MODES: [
        WarningsViewModel.TYPE.CONNECTIVITY_RECONNECT,
        WarningsViewModel.TYPE.LIFECYCLE_UPDATE,
        WarningsViewModel.TYPE.NO_INTERNET,
      ],
    };
  }

  static get TYPE() {
    return {
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
      UNSUPPORTED_OUTGOING_CALL: 'unsupported_outgoing_call',
    };
  }

  constructor() {
    this.elementId = 'warnings';
    this.logger = getLogger('WarningsViewModel');

    // Array of warning banners
    this.warnings = ko.observableArray();
    this.visibleWarning = ko.pureComputed(() => this.warnings()[this.warnings().length - 1]);
    this.Environment = Environment;
    this.TYPE = WarningsViewModel.TYPE;
    this.Config = Config;

    this.warnings.subscribe(warnings => {
      let topMargin;

      const visibleWarning = warnings[warnings.length - 1];
      const isConnectivityRecovery = visibleWarning === WarningsViewModel.TYPE.CONNECTIVITY_RECOVERY;
      const noMargin = !warnings.length || isConnectivityRecovery;
      if (noMargin) {
        topMargin = '0';
      } else {
        const isMiniMode = WarningsViewModel.CONFIG.MINI_MODES.includes(visibleWarning);
        topMargin = isMiniMode ? '32px' : '64px';
      }

      document.querySelector('#app').style.top = topMargin;
      afterRender(() => window.dispatchEvent(new Event('resize')));
    });

    this.name = ko.observable();

    this.warningDimmed = ko
      .pureComputed(() => {
        for (const warning of this.warnings()) {
          const isDimmedMode = WarningsViewModel.CONFIG.DIMMED_MODES.includes(warning);
          if (isDimmedMode) {
            return true;
          }
        }
        return false;
      })
      .extend({rateLimit: 200});

    amplify.subscribe(WebAppEvents.WARNING.SHOW, this.showWarning.bind(this));
    amplify.subscribe(WebAppEvents.WARNING.DISMISS, this.dismissWarning.bind(this));

    ko.applyBindings(this, document.getElementById(this.elementId));

    this.WebAppEvents = WebAppEvents;
    this.brandName = Config.BRAND_NAME;
  }

  /**
   * Close warning.
   * @note Used to close a warning banner by clicking the close button
   * @returns {undefined} No return value
   */
  closeWarning() {
    const warningToClose = this.visibleWarning();
    this.dismissWarning(warningToClose);

    switch (warningToClose) {
      case WarningsViewModel.TYPE.REQUEST_MICROPHONE: {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
          primaryAction: {
            action: () => {
              const url = buildSupportUrl(Config.SUPPORT.ID.MICROPHONE_ACCESS_DENIED);
              safeWindowOpen(url);
            },
            text: t('modalCallNoMicrophoneAction'),
          },
          text: {
            message: t('modalCallNoMicrophoneMessage'),
            title: t('modalCallNoMicrophoneHeadline'),
          },
        });
        break;
      }

      case WarningsViewModel.TYPE.REQUEST_NOTIFICATION: {
        // We block subsequent permission requests for notifications when the user ignores the request.
        amplify.publish(WebAppEvents.NOTIFICATION.PERMISSION_STATE, PermissionState.IGNORED);
        break;
      }

      default:
        break;
    }
  }

  dismissWarning(type = this.visibleWarning()) {
    const dismissedWarnings = this.warnings.remove(type);
    if (dismissedWarnings.length) {
      this.logger.info(`Dismissed warning of type '${type}'`);
    }
  }

  showWarning(type, info) {
    const connectivityTypes = [WarningsViewModel.TYPE.CONNECTIVITY_RECONNECT, WarningsViewModel.TYPE.NO_INTERNET];
    const isConnectivityWarning = connectivityTypes.includes(type);
    const visibleWarningIsLifecycleUpdate = this.visibleWarning() === WarningsViewModel.TYPE.LIFECYCLE_UPDATE;
    if (isConnectivityWarning && !visibleWarningIsLifecycleUpdate) {
      this.dismissWarning(this.visibleWarning());
    }

    this.logger.warn(`Showing warning of type '${type}'`);
    if (info) {
      this.name(info.name);
    }
    this.warnings.push(type);
  }
}
