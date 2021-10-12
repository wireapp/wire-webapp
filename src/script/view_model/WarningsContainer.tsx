/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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
import ReactDOM from 'react-dom';
import {amplify} from 'amplify';
import cx from 'classnames';

import {getLogger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {safeWindowOpen} from 'Util/SanitizationUtil';
import {afterRender} from 'Util/util';

import {Config} from '../Config';
import {ModalsViewModel} from './ModalsViewModel';
import {PermissionState} from '../notification/PermissionState';
import {Runtime} from '@wireapp/commons';

import React, {useEffect, useState} from 'react';
import Icon from 'Components/Icon';

const WarningsContainer: React.FC = () => {
  const logger = getLogger('WarningsViewModel');

  const type = TYPE;

  const [name, setName] = useState<string>();
  const [warnings, setWarnings] = useState<string[]>([]);
  const visibleWarning = warnings[warnings.length - 1];

  const warningDimmed = warnings.some(warning => CONFIG.DIMMED_MODES.includes(warning));

  useEffect(() => {
    const visibleWarning = warnings[warnings.length - 1];
    const isConnectivityRecovery = visibleWarning === TYPE.CONNECTIVITY_RECOVERY;
    const hasOffset = warnings.length > 0 && !isConnectivityRecovery;
    const isMiniMode = CONFIG.MINI_MODES.includes(visibleWarning);

    const app = document.querySelector('#app');
    app.classList.toggle('app--small-offset', hasOffset && isMiniMode);
    app.classList.toggle('app--large-offset', hasOffset && !isMiniMode);

    afterRender(() => window.dispatchEvent(new Event('resize')));
  }, [warnings]);

  const lifeCycleRefresh = WebAppEvents.LIFECYCLE.REFRESH;
  const brandName = Config.getConfig().BRAND_NAME;
  const URL = Config.getConfig().URL;

  /**
   * Close warning.
   * @note Used to close a warning banner by clicking the close button
   */
  const closeWarning = (): void => {
    const warningToClose = visibleWarning;

    if (warnings.includes(warningToClose)) {
      setWarnings(warnings.filter(warning => warning !== warningToClose));
      logger.info(`Dismissed warning of type '${type}'`);
    }

    switch (warningToClose) {
      case TYPE.REQUEST_MICROPHONE: {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
          primaryAction: {
            action: () => {
              safeWindowOpen(URL.SUPPORT.MICROPHONE_ACCESS_DENIED);
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

      case TYPE.REQUEST_NOTIFICATION: {
        // We block subsequent permission requests for notifications when the user ignores the request.
        amplify.publish(WebAppEvents.NOTIFICATION.PERMISSION_STATE, PermissionState.IGNORED);
        break;
      }

      default:
        break;
    }
  };

  useEffect(() => {
    const hideWarning = (type = visibleWarning) => {
      if (warnings.includes(type)) {
        setWarnings(warnings.filter(warning => warning !== type));
        logger.info(`Dismissed warning of type '${type}'`);
      }
    };

    const showWarning = (type: string, info: {name: string}) => {
      const connectivityTypes = [TYPE.CONNECTIVITY_RECONNECT, TYPE.NO_INTERNET];
      const isConnectivityWarning = connectivityTypes.includes(type);
      const visibleWarningIsLifecycleUpdate = visibleWarning === TYPE.LIFECYCLE_UPDATE;
      if (isConnectivityWarning && !visibleWarningIsLifecycleUpdate) {
        hideWarning(visibleWarning);
      }

      logger.warn(`Showing warning of type '${type}'`);
      if (info) {
        setName(info.name);
      }

      setWarnings(warnings => [...warnings, type]);
    };

    amplify.subscribe(WebAppEvents.WARNING.SHOW, showWarning);
    amplify.subscribe(WebAppEvents.WARNING.DISMISS, hideWarning);

    return () => {
      amplify.unsubscribe(WebAppEvents.WARNING.SHOW, showWarning);
      amplify.unsubscribe(WebAppEvents.WARNING.DISMISS, hideWarning);
    };
  });

  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className={cx('warning', {'warning-dimmed': warningDimmed})}>
      {visibleWarning === type.REQUEST_CAMERA && (
        <div className="warning-bar warning-bar-feature">
          <div
            className="warning-bar-message"
            dangerouslySetInnerHTML={{
              __html: t(
                'warningPermissionRequestCamera',
                {},
                {icon: "<span class='warning-bar-icon icon-camera'></span>"},
              ),
            }}
          />
          <span className="warning-bar-close icon-close button-icon" onClick={closeWarning} />
        </div>
      )}

      {visibleWarning === type.DENIED_CAMERA && (
        <div className="warning-bar warning-bar-feature">
          <div className="warning-bar-message">
            <span>{t('warningPermissionDeniedCamera')}</span>&nbsp;
            <a
              className="warning-bar-link"
              href={URL.SUPPORT.CAMERA_ACCESS_DENIED}
              rel="nofollow noopener noreferrer"
              target="_blank"
            >
              {t('warningLearnMore')}
            </a>
          </div>
          <span className="warning-bar-close icon-close button-round button-round-dark" onClick={closeWarning} />
        </div>
      )}

      {visibleWarning === type.REQUEST_MICROPHONE && (
        <div className="warning-bar warning-bar-feature">
          <div className="warning-bar-message">
            <Icon.MicOn className="warning-bar-icon"></Icon.MicOn>
            <span dangerouslySetInnerHTML={{__html: t('warningPermissionRequestMicrophone', {}, {icon: ''})}} />
          </div>
          <span className="warning-bar-close icon-close button-round button-round-dark" onClick={closeWarning} />
        </div>
      )}

      {visibleWarning === type.DENIED_MICROPHONE && (
        <div className="warning-bar warning-bar-feature">
          <div className="warning-bar-message">
            <span>{t('warningPermissionDeniedMicrophone')}</span>&nbsp;
            <a
              className="warning-bar-link"
              rel="nofollow noopener noreferrer"
              target="_blank"
              href={URL.SUPPORT.MICROPHONE_ACCESS_DENIED}
            >
              {t('warningLearnMore')}
            </a>
          </div>
          <span className="warning-bar-close icon-close button-round button-round-dark" onClick={closeWarning} />
        </div>
      )}

      {visibleWarning === type.REQUEST_SCREEN && (
        <div className="warning-bar warning-bar-feature">
          <div
            className="warning-bar-message"
            dangerouslySetInnerHTML={{
              __html: t(
                'warningPermissionRequestScreen',
                {},
                {icon: "<span class='warning-bar-icon icon-screensharing'></span>"},
              ),
            }}
          />
          <span className="warning-bar-close icon-close button-icon" onClick={closeWarning} />
        </div>
      )}

      {visibleWarning === type.DENIED_SCREEN && (
        <div className="warning-bar warning-bar-feature">
          <div className="warning-bar-message">
            <span>{t('warningPermissionDeniedScreen')}</span>&nbsp;
            <a
              className="warning-bar-link"
              rel="nofollow noopener noreferrer"
              target="_blank"
              href={URL.SUPPORT.SCREEN_ACCESS_DENIED}
            >
              {t('warningLearnMore')}
            </a>
          </div>
          <span className="warning-bar-close icon-close button-round button-round-dark" onClick={closeWarning} />
        </div>
      )}

      {visibleWarning === type.NOT_FOUND_CAMERA && (
        <div className="warning-bar warning-bar-feature">
          <div className="warning-bar-message">
            <span>{t('warningNotFoundCamera')}</span>&nbsp;
            <a
              className="warning-bar-link"
              rel="nofollow noopener noreferrer"
              target="_blank"
              href={URL.SUPPORT.DEVICE_NOT_FOUND}
            >
              {t('warningLearnMore')}
            </a>
          </div>
          <span className="warning-bar-close icon-close button-round button-round-dark" onClick={closeWarning} />
        </div>
      )}

      {visibleWarning === type.NOT_FOUND_MICROPHONE && (
        <div className="warning-bar warning-bar-feature">
          <div className="warning-bar-message">
            <span>{t('warningNotFoundMicrophone')}</span>&nbsp;
            <a
              className="warning-bar-link"
              rel="nofollow noopener noreferrer"
              target="_blank"
              href={URL.SUPPORT.DEVICE_NOT_FOUND}
            >
              {t('warningLearnMore')}
            </a>
          </div>
          <span className="warning-bar-close icon-close button-round button-round-dark" onClick={closeWarning} />
        </div>
      )}

      {visibleWarning === type.REQUEST_NOTIFICATION && (
        <div className="warning-bar warning-bar-feature">
          <div
            className="warning-bar-message"
            dangerouslySetInnerHTML={{
              __html: t(
                'warningPermissionRequestNotification',
                {},
                {icon: "<span class='warning-bar-icon icon-envelope'></span>"},
              ),
            }}
          ></div>
          <span
            className="warning-bar-close icon-close button-round button-round-dark"
            onClick={closeWarning}
            data-uie-name="do-close-warning"
          />
        </div>
      )}

      {visibleWarning === type.UNSUPPORTED_INCOMING_CALL && (
        <div className="warning-bar warning-bar-feature">
          {!Runtime.isChrome() && (
            <div className="warning-bar-message">
              <span>{t('warningCallUnsupportedIncoming', name)}</span>&nbsp;
              <a
                className="warning-bar-link"
                rel="nofollow noopener noreferrer"
                target="_blank"
                href={URL.SUPPORT.CALLING}
              >
                {t('warningLearnMore')}
              </a>
            </div>
          )}
          {Runtime.isChrome() && Runtime.isDesktopApp() ? (
            <div className="warning-bar-message">
              <span>{t('warningCallIssues', brandName)}</span>&nbsp;
              <a
                className="warning-bar-link"
                rel="nofollow noopener noreferrer"
                target="_blank"
                href={window.wire.env.APP_BASE}
              >
                {t('wire_for_web', brandName)}
              </a>
            </div>
          ) : (
            <div className="warning-bar-message">
              <span>{t('warningCallUpgradeBrowser')}</span>
            </div>
          )}
          <span className="warning-bar-close icon-close button-round button-round-dark" onClick={closeWarning} />
        </div>
      )}

      {visibleWarning === type.UNSUPPORTED_OUTGOING_CALL && (
        <div className="warning-bar warning-bar-feature">
          {!Runtime.isChrome() && (
            <div className="warning-bar-message">
              <span>{t('warningCallUnsupportedOutgoing')}</span>&nbsp;
              <a
                className="warning-bar-link"
                rel="nofollow noopener noreferrer"
                target="_blank"
                href={URL.SUPPORT.CALLING}
              >
                {t('warningLearnMore')}
              </a>
            </div>
          )}
          {Runtime.isChrome() && Runtime.isDesktopApp() ? (
            <div className="warning-bar-message">
              <span>{t('warningCallIssues', brandName)}</span>&nbsp;
              <a
                className="warning-bar-link"
                rel="nofollow noopener noreferrer"
                target="_blank"
                href={window.wire.env.APP_BASE}
              >
                {t('wire_for_web', brandName)}
              </a>
            </div>
          ) : (
            <div className="warning-bar-message">
              <span>{t('warningCallUpgradeBrowser')}</span>
            </div>
          )}
          <span className="warning-bar-close icon-close button-round button-round-dark" onClick={closeWarning} />
        </div>
      )}

      {visibleWarning === type.CONNECTIVITY_RECONNECT && (
        <div className="warning-bar warning-bar-connection">
          <div className="warning-bar-message">
            <span>{t('warningConnectivityConnectionLost', brandName)}</span>
            <Icon.Loading className="warning-bar-spinner" data-uie-name="status-loading"></Icon.Loading>
          </div>
        </div>
      )}

      {visibleWarning === type.CALL_QUALITY_POOR && (
        <div className="warning-bar warning-bar-connection warning-bar-poor-call-quality">
          <div className="warning-bar-message">
            <span>{t('warningCallQualityPoor')}</span>
          </div>
        </div>
      )}

      {visibleWarning === type.CONNECTIVITY_RECOVERY && <div className="warning-bar warning-bar-progress"></div>}

      {visibleWarning === type.NO_INTERNET && (
        <div className="warning-bar warning-bar-connection">
          <div className="warning-bar-message">{t('warningConnectivityNoInternet')}</div>
        </div>
      )}

      {visibleWarning === type.LIFECYCLE_UPDATE && (
        <div className="warning-bar warning-bar-connection">
          <div className="warning-bar-message">
            <span>{t('warningLifecycleUpdate', brandName)}</span>&nbsp;
            <a
              className="warning-bar-link"
              href={URL.WHATS_NEW}
              rel="nofollow noopener noreferrer"
              target="_blank"
              data-uie-name="go-whats-new"
            >
              {t('warningLifecycleUpdateNotes')}
            </a>
            &nbsp;·&nbsp;
            <a
              className="warning-bar-link"
              onClick={() => amplify.publish(lifeCycleRefresh)}
              rel="nofollow noopener noreferrer"
              target="_blank"
              data-uie-name="do-update"
            >
              {t('warningLifecycleUpdateLink')}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

const TYPE = {
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

const CONFIG = {
  DIMMED_MODES: [TYPE.REQUEST_CAMERA, TYPE.REQUEST_MICROPHONE, TYPE.REQUEST_NOTIFICATION, TYPE.REQUEST_SCREEN],
  MINI_MODES: [TYPE.CONNECTIVITY_RECONNECT, TYPE.LIFECYCLE_UPDATE, TYPE.NO_INTERNET, TYPE.CALL_QUALITY_POOR],
};

const Warnings = {
  CONFIG,
  TYPE,
  init: () => {
    ReactDOM.render(<WarningsContainer />, document.getElementById('warnings'));
  },
};

export default Warnings;
