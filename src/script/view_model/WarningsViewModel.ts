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

import {WebAppEvents} from '@wireapp/webapp-events';
import ko from 'knockout';
import {amplify} from 'amplify';

import {getLogger, Logger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {safeWindowOpen} from 'Util/SanitizationUtil';
import {afterRender} from 'Util/util';

import {Config, Configuration} from '../Config';
import {ModalsViewModel} from './ModalsViewModel';
import {PermissionState} from '../notification/PermissionState';
import {Runtime} from '@wireapp/commons';

export class WarningsViewModel {
  elementId: 'warnings';
  logger: Logger;
  warnings: ko.ObservableArray<any>;
  visibleWarning: ko.PureComputed<any>;
  Config: Configuration;
  name: ko.Observable<string>;
  warningDimmed: ko.PureComputed<boolean>;
  brandName: string;
  Runtime: typeof Runtime;
  isDesktop: boolean;
  type: typeof WarningsViewModel.TYPE;
  lifeCycleRefresh: string;

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
        WarningsViewModel.TYPE.CALL_QUALITY_POOR,
      ],
    };
  }

  static get TYPE() {
    return {
      CALL_QUALITY_POOR: 'call_quality_poor',
      CONNECTIVITY_RECONNECT: 'connectivity_reconnect',
      CONNECTIVITY_RECOVERY: 'connectivity_recovery',
      DENIED_CAMERA: 'camera_access_denied',
      DENIED_MICROPHONE: 'mic_access_denied',
      DENIED_SCREEN: 'screen_access_denied',
      LIFECYCLE_UPDATE: 'lifecycle_update',
      NOT_FOUND_CAMERA: 'not_found_camera',
      NOT_FOUND_MICROPHONE: 'not_found_microphone',
      NO_INTERNET: 'no_internet',
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
    this.Runtime = Runtime;
    this.type = WarningsViewModel.TYPE;
    this.Config = Config.getConfig();

    this.warnings.subscribe(warnings => {
      const visibleWarning = warnings[warnings.length - 1];
      const isConnectivityRecovery = visibleWarning === WarningsViewModel.TYPE.CONNECTIVITY_RECOVERY;
      const hasOffset = warnings.length > 0 && !isConnectivityRecovery;
      const isMiniMode = WarningsViewModel.CONFIG.MINI_MODES.includes(visibleWarning);

      const app = document.querySelector('#app');
      app.classList.toggle('app--small-offset', hasOffset && isMiniMode);
      app.classList.toggle('app--large-offset', hasOffset && !isMiniMode);

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

    amplify.subscribe(WebAppEvents.WARNING.SHOW, this.showWarning);
    amplify.subscribe(WebAppEvents.WARNING.DISMISS, this.dismissWarning);

    ko.applyBindings(this, document.getElementById(this.elementId));

    this.lifeCycleRefresh = WebAppEvents.LIFECYCLE.REFRESH;
    this.brandName = Config.getConfig().BRAND_NAME;
  }

  /**
   * Close warning.
   * @note Used to close a warning banner by clicking the close button
   */
  closeWarning = (): void => {
    const warningToClose = this.visibleWarning();
    this.dismissWarning(warningToClose);

    switch (warningToClose) {
      case WarningsViewModel.TYPE.REQUEST_MICROPHONE: {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
          primaryAction: {
            action: () => {
              safeWindowOpen(Config.getConfig().URL.SUPPORT.MICROPHONE_ACCESS_DENIED);
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
  };

  dismissWarning = (type = this.visibleWarning()) => {
    const dismissedWarnings = this.warnings.remove(type);
    if (dismissedWarnings.length) {
      this.logger.info(`Dismissed warning of type '${type}'`);
    }
  };

  showWarning = (type: string, info: {name: string}) => {
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
  };
}
