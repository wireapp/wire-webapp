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

import {useEffect} from 'react';

import cx from 'classnames';

import {Runtime} from '@wireapp/commons';

import * as Icon from 'Components/icon';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {afterRender} from 'Util/util';

import {closeWarning, useWarningsState} from './WarningsState';
import {CONFIG, TYPE} from './WarningsTypes';

import {Config} from '../../Config';

interface WarningProps {
  onRefresh: () => void;
}

const WarningsContainer = ({onRefresh}: WarningProps) => {
  const {translate} = useApplicationContext();
  const name = useWarningsState(state => state.name);
  const warnings = useWarningsState(state => state.warnings);
  const type = TYPE;
  const visibleWarning = warnings[warnings.length - 1];
  const warningDimmed = warnings.some(warning => CONFIG.DIMMED_MODES.includes(warning));

  useEffect(() => {
    const visibleWarning = warnings[warnings.length - 1];
    const isConnectivityRecovery = visibleWarning === TYPE.CONNECTIVITY_RECOVERY;
    const hasOffset = warnings.length > 0 && !isConnectivityRecovery;
    const isMiniMode = CONFIG.MINI_MODES.includes(visibleWarning);

    const app = document.querySelector('#app');
    if (app) {
      app.classList.toggle('app--small-offset', hasOffset && isMiniMode);
      app.classList.toggle('app--large-offset', hasOffset && !isMiniMode);
    }

    afterRender(() => window.dispatchEvent(new Event('resize')));
  }, [warnings]);

  const brandName = Config.getConfig().BRAND_NAME;
  const URL = Config.getConfig().URL;

  const closeButton = (
    <button
      type="button"
      data-uie-name="do-close-warning"
      className="warning-bar-close icon-close button-round button-round-dark button-reset-default"
      onClick={() => closeWarning(translate)}
    />
  );

  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className={cx('warning', {'warning-dimmed': warningDimmed})}>
      {visibleWarning === type.REQUEST_CAMERA && (
        <div data-uie-name="request-camera" className="warning-bar warning-bar-feature">
          <div
            className="warning-bar-message"
            dangerouslySetInnerHTML={{
              __html: translate('warningPermissionRequestCamera', undefined, {
                icon: "<span class='warning-bar-icon icon-camera'></span>",
              }),
            }}
          />
          {closeButton}
        </div>
      )}
      {visibleWarning === type.DENIED_CAMERA && (
        <div data-uie-name="denied-camera" className="warning-bar warning-bar-feature">
          <div className="warning-bar-message">
            <span>{translate('warningPermissionDeniedCamera')}</span>&nbsp;
            <a
              className="warning-bar-link"
              href={URL.SUPPORT.CAMERA_ACCESS_DENIED}
              rel="nofollow noopener noreferrer"
              target="_blank"
            >
              {translate('warningLearnMore')}
            </a>
          </div>
          {closeButton}
        </div>
      )}
      {visibleWarning === type.REQUEST_MICROPHONE && (
        <div data-uie-name="request-microphone" className="warning-bar warning-bar-feature">
          <div className="warning-bar-message">
            <Icon.MicOnIcon className="warning-bar-icon" />
            <span
              dangerouslySetInnerHTML={{__html: translate('warningPermissionRequestMicrophone', undefined, {icon: ''})}}
            />
          </div>
          {closeButton}
        </div>
      )}
      {visibleWarning === type.DENIED_MICROPHONE && (
        <div data-uie-name="denied-microphone" className="warning-bar warning-bar-feature">
          <div className="warning-bar-message">
            <span>{translate('warningPermissionDeniedMicrophone')}</span>&nbsp;
            <a
              className="warning-bar-link"
              rel="nofollow noopener noreferrer"
              target="_blank"
              href={URL.SUPPORT.MICROPHONE_ACCESS_DENIED}
            >
              {translate('warningLearnMore')}
            </a>
          </div>
          {closeButton}
        </div>
      )}
      {visibleWarning === type.REQUEST_SCREEN && (
        <div data-uie-name="request-screen" className="warning-bar warning-bar-feature">
          <div
            className="warning-bar-message"
            dangerouslySetInnerHTML={{
              __html: translate('warningPermissionRequestScreen', undefined, {
                icon: "<span class='warning-bar-icon icon-screensharing'></span>",
              }),
            }}
          />
          {closeButton}
        </div>
      )}
      {visibleWarning === type.DENIED_SCREEN && (
        <div data-uie-name="denied-screen" className="warning-bar warning-bar-feature">
          <div className="warning-bar-message">
            <span>{translate('warningPermissionDeniedScreen')}</span>&nbsp;
            <a
              className="warning-bar-link"
              rel="nofollow noopener noreferrer"
              target="_blank"
              href={URL.SUPPORT.SCREEN_ACCESS_DENIED}
            >
              {translate('warningLearnMore')}
            </a>
          </div>
          {closeButton}
        </div>
      )}
      {visibleWarning === type.NOT_FOUND_CAMERA && (
        <div data-uie-name="not-found-camera" className="warning-bar warning-bar-feature">
          <div className="warning-bar-message">
            <span>{translate('warningNotFoundCamera')}</span>&nbsp;
            <a
              className="warning-bar-link"
              rel="nofollow noopener noreferrer"
              target="_blank"
              href={URL.SUPPORT.DEVICE_NOT_FOUND}
            >
              {translate('warningLearnMore')}
            </a>
          </div>
          {closeButton}
        </div>
      )}
      {visibleWarning === type.NOT_FOUND_MICROPHONE && (
        <div data-uie-name="not-found-microphone" className="warning-bar warning-bar-feature">
          <div className="warning-bar-message">
            <span>{translate('warningNotFoundMicrophone')}</span>&nbsp;
            <a
              className="warning-bar-link"
              rel="nofollow noopener noreferrer"
              target="_blank"
              href={URL.SUPPORT.DEVICE_NOT_FOUND}
            >
              {translate('warningLearnMore')}
            </a>
          </div>
          {closeButton}
        </div>
      )}
      {visibleWarning === type.REQUEST_NOTIFICATION && (
        <div data-uie-name="request-notification" className="warning-bar warning-bar-feature">
          <div
            className="warning-bar-message"
            dangerouslySetInnerHTML={{
              __html: translate('warningPermissionRequestNotification', undefined, {
                icon: "<span class='warning-bar-icon icon-envelope'></span>",
              }),
            }}
          />
          {closeButton}
        </div>
      )}
      {visibleWarning === type.UNSUPPORTED_INCOMING_CALL && (
        <div data-uie-name="unsupported-incoming-call" className="warning-bar warning-bar-feature">
          {!Runtime.isChrome() && (
            <div className="warning-bar-message">
              <span>{translate('warningCallUnsupportedIncoming', {user: name})}</span>&nbsp;
              <a
                className="warning-bar-link"
                rel="nofollow noopener noreferrer"
                target="_blank"
                href={URL.SUPPORT.CALLING}
              >
                {translate('warningLearnMore')}
              </a>
            </div>
          )}
          {Runtime.isChrome() && Runtime.isDesktopApp() ? (
            <div className="warning-bar-message">
              <span>{translate('warningCallIssues', {brandName})}</span>&nbsp;
              <a
                className="warning-bar-link"
                rel="nofollow noopener noreferrer"
                target="_blank"
                href={window.wire.env.APP_BASE}
              >
                {translate('wire_for_web', {brandName})}
              </a>
            </div>
          ) : (
            <div className="warning-bar-message">
              <span>{translate('warningCallUpgradeBrowser')}</span>
            </div>
          )}
          {closeButton}
        </div>
      )}
      {visibleWarning === type.UNSUPPORTED_OUTGOING_CALL && (
        <div data-uie-name="unsupported-outgoing-call" className="warning-bar warning-bar-feature">
          {!Runtime.isChrome() && (
            <div className="warning-bar-message">
              <span>{translate('warningCallUnsupportedOutgoing')}</span>&nbsp;
              <a
                className="warning-bar-link"
                rel="nofollow noopener noreferrer"
                target="_blank"
                href={URL.SUPPORT.CALLING}
              >
                {translate('warningLearnMore')}
              </a>
            </div>
          )}
          {Runtime.isChrome() && Runtime.isDesktopApp() ? (
            <div className="warning-bar-message">
              <span>{translate('warningCallIssues', {brandName})}</span>&nbsp;
              <a
                className="warning-bar-link"
                rel="nofollow noopener noreferrer"
                target="_blank"
                href={window.wire.env.APP_BASE}
              >
                {translate('wire_for_web', {brandName})}
              </a>
            </div>
          ) : (
            <div className="warning-bar-message">
              <span>{translate('warningCallUpgradeBrowser')}</span>
            </div>
          )}
          {closeButton}
        </div>
      )}
      {visibleWarning === type.CONNECTIVITY_RECONNECT && (
        <div data-uie-name="connectivity-reconnect" className="warning-bar warning-bar-connection">
          <div className="warning-bar-message">
            <span>{translate('warningConnectivityConnectionLost', {brandName})}</span>
            <Icon.LoadingIcon className="warning-bar-spinner" data-uie-name="status-loading" />
          </div>
        </div>
      )}
      {visibleWarning === type.CALL_QUALITY_POOR && (
        <div data-uie-name="call-quality-poor" className="warning-bar warning-bar-connection">
          <div className="warning-bar-message">
            <span>{translate('warningCallQualityPoor')}</span>
          </div>
        </div>
      )}
      {visibleWarning === type.CONNECTIVITY_RECOVERY && (
        <div data-uie-name="connectivity-recovery" className="warning-bar warning-bar-progress" />
      )}
      {visibleWarning === type.NO_INTERNET && (
        <div data-uie-name="no-internet" className="warning-bar warning-bar-connection">
          <div className="warning-bar-message">{translate('warningConnectivityNoInternet')}</div>
        </div>
      )}
      {visibleWarning === type.LIFECYCLE_UPDATE && (
        <div data-uie-name="lifecycle-update" className="warning-bar warning-bar-connection">
          <div className="warning-bar-message">
            <span>{translate('warningLifecycleUpdate', {brandName})}</span>&nbsp;
            <a
              className="warning-bar-link"
              href={URL.WHATS_NEW}
              rel="nofollow noopener noreferrer"
              target="_blank"
              data-uie-name="go-whats-new"
            >
              {translate('warningLifecycleUpdateNotes')}
            </a>
            &nbsp;·&nbsp;
            <button
              type="button"
              className="warning-bar-link button-reset-default"
              onClick={onRefresh}
              data-uie-name="do-update"
            >
              {translate('warningLifecycleUpdateLink')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export {WarningsContainer};
