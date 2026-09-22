/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
import {result} from 'true-myth';

import {Runtime} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';

import {systemNotificationErrors, type SystemNotificationApi} from 'src/script/notification/systemNotificationTypes';
import {getLogger} from 'Util/logger';

type SystemNotificationLogger = {
  warn: (message: string, context?: unknown) => void;
};

export type BrowserNotificationDependencies = {
  notificationConstructor: typeof Notification;
  logger: SystemNotificationLogger;
  isSupported: () => boolean;
  focusWindow: () => void;
  publishNotificationClick: () => void;
};

/**
 * Presents system notifications through the page-context `window.Notification`. The Electron
 * wrapper maps that very same API to a native OS toast, so this is the only adapter both the
 * browser and the desktop app need.
 *
 * Every browser primitive is injected so the platform behaviour above can be exercised without
 * touching globals.
 */
export const createSystemNotificationApiFromBrowserNotification = ({
  notificationConstructor,
  logger,
  isSupported,
  focusWindow,
  publishNotificationClick,
}: BrowserNotificationDependencies): SystemNotificationApi => ({
  isSupported,
  getPermission: () => notificationConstructor.permission,
  show: ({title, body, tag, onClick, onClose}) =>
    result.tryOrElse(
      () => systemNotificationErrors.presentationFailed,
      () => {
        const notification = new notificationConstructor(title, {body, tag});
        const closeNotification = () =>
          result.tryOrElse(
            () => systemNotificationErrors.closeFailed,
            () => {
              notification.close();
            },
          );

        notification.onclick = () => {
          // wire-desktop listens for this to restore the window and switch to the account that
          // raised the notification. window.focus() alone does neither from inside a webview.
          publishNotificationClick();
          focusWindow();
          onClick();
        };

        notification.onclose = () => {
          onClose();
        };

        // A notification can fail after the constructor returned, so `show` reporting `Ok` is not
        // the last word on whether it reached the user.
        notification.onerror = () => {
          logger.warn('system notification failed after being shown', {tag});
          onClose();
          closeNotification();
        };

        return {close: closeNotification};
      },
    ),
});

/**
 * The outermost browser boundary: the one place that reaches for the page globals.
 */
export const createBrowserSystemNotificationApi = (): SystemNotificationApi =>
  createSystemNotificationApiFromBrowserNotification({
    notificationConstructor: window.Notification,
    logger: getLogger('SystemNotification'),
    isSupported: () => Runtime.isSupportingNotifications(),
    focusWindow: () => window.focus(),
    publishNotificationClick: () => amplify.publish(WebAppEvents.NOTIFICATION.CLICK),
  });
