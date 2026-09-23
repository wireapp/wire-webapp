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

import {
  systemNotificationErrorKinds,
  toSystemNotificationError,
  type SystemNotificationApi,
  type SystemNotificationPermission,
} from 'src/script/notification/systemNotificationTypes';
import {getLogger} from 'Util/logger';

type SystemNotificationLogger = {
  warn: (message: string, context?: unknown) => void;
};

/** The part of a platform notification this adapter uses, so nothing has to fake the rest of it. */
export type PlatformNotification = {
  onClick: (listener: () => void) => void;
  onClose: (listener: () => void) => void;
  onError: (listener: (event: unknown) => void) => void;
  close: () => void;
};

export type PlatformNotificationRequest = {
  title: string;
  body: string;
  tag: string;
};

export type BrowserNotificationDependencies = {
  createNotification: (request: PlatformNotificationRequest) => PlatformNotification;
  getPermission: () => SystemNotificationPermission;
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
  createNotification,
  getPermission,
  logger,
  isSupported,
  focusWindow,
  publishNotificationClick,
}: BrowserNotificationDependencies): SystemNotificationApi => ({
  isSupported,
  getPermission,
  show: ({title, body, tag, onClick, onClose}) =>
    result.tryOrElse(toSystemNotificationError(systemNotificationErrorKinds.presentationFailed), () => {
      const notification = createNotification({title, body, tag});
      // The platform fires its close event for a programmatic close too, so without this guard a
      // close we asked for would be reported twice.
      let closeReported = false;

      const reportClose = () => {
        if (closeReported) {
          return;
        }

        closeReported = true;
        onClose();
      };

      const closeNotification = () => {
        const closeAttempt = result.tryOrElse(
          toSystemNotificationError(systemNotificationErrorKinds.closeFailed),
          () => {
            notification.close();
          },
        );

        // Only a close that worked means the notification is gone.
        return closeAttempt.inspect(reportClose);
      };

      notification.onClick(() => {
        // wire-desktop listens for this to restore the window and switch to the account that
        // raised the notification. window.focus() alone does neither from inside a webview.
        publishNotificationClick();
        focusWindow();
        onClick();
      });

      notification.onClose(() => {
        reportClose();
      });

      // A notification can fail after the constructor returned, so `show` reporting `Ok` is not
      // the last word on whether it reached the user.
      notification.onError(() => {
        logger.warn('system notification failed after being shown', {tag});

        closeNotification().inspectErr(error => {
          logger.warn('failed to close a system notification that errored', {
            error: error.kind,
            cause: error.cause,
            tag,
          });
        });
      });

      return {close: closeNotification};
    }),
});

const createBrowserNotification = ({title, body, tag}: PlatformNotificationRequest): PlatformNotification => {
  const notification = new window.Notification(title, {body, tag});

  return {
    onClick: listener => {
      notification.onclick = listener;
    },
    onClose: listener => {
      notification.onclose = listener;
    },
    onError: listener => {
      notification.onerror = listener;
    },
    close: () => {
      notification.close();
    },
  };
};

/**
 * The outermost browser boundary: the one place that reaches for the page globals.
 */
export const createBrowserSystemNotificationApi = (): SystemNotificationApi =>
  createSystemNotificationApiFromBrowserNotification({
    createNotification: createBrowserNotification,
    getPermission: () => window.Notification.permission,
    logger: getLogger('SystemNotification'),
    isSupported: () => Runtime.isSupportingNotifications(),
    focusWindow: () => window.focus(),
    publishNotificationClick: () => amplify.publish(WebAppEvents.NOTIFICATION.CLICK),
  });
