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

import {Maybe, result, type Result} from 'true-myth';

import {Runtime} from '@wireapp/commons';

import type {MeetingReminderFirePayload} from 'Components/meeting/createMeetingReminderScheduler';
import type {Translate} from 'Util/localizerUtil';

import {toMeetingIdKey} from './utils/toMeetingIdKey';

type MeetingReminderOsNotifierLogger = {
  info: (message: string, context?: unknown) => void;
  warn: (message: string, context?: unknown) => void;
};

export const meetingReminderNotificationErrors = {
  presentationFailed: 'presentationFailed',
  closeFailed: 'closeFailed',
} as const;

export type MeetingReminderNotificationError =
  (typeof meetingReminderNotificationErrors)[keyof typeof meetingReminderNotificationErrors];

export type MeetingReminderNotificationRequest = {
  title: string;
  body: string;
  tag: string;
  onClick: () => void;
};

export type MeetingReminderNotificationHandle = {
  close: () => Result<void, MeetingReminderNotificationError>;
};

/**
 * The page-context notification surface this presenter writes to. Kept behind a port so the
 * presenter stays testable without a DOM, and so the Electron wrapper needs no separate sink:
 * it maps the very same `window.Notification` to a native OS toast.
 *
 * The port owns the throwing browser boundary and reports failures as a `Result`, which keeps
 * the presenter itself free of exception handling.
 */
export type MeetingReminderNotificationApi = {
  isSupported: () => boolean;
  getPermission: () => NotificationPermission;
  show: (
    request: MeetingReminderNotificationRequest,
  ) => Result<MeetingReminderNotificationHandle, MeetingReminderNotificationError>;
};

export type CreateMeetingReminderOsNotifierDependencies = {
  notificationApi: MeetingReminderNotificationApi;
  openMeetingsList: () => void;
  formatMeetingTime: (meetingStartTime: string) => string;
  translate: Translate;
  logger: MeetingReminderOsNotifierLogger;
};

export type MeetingReminderOsNotifier = {
  notify: (payload: MeetingReminderFirePayload) => void;
  stop: () => void;
};

const grantedPermission: NotificationPermission = 'granted';

export const toMeetingReminderNotificationTag = (payload: MeetingReminderFirePayload): string =>
  `meeting-reminder:${toMeetingIdKey(payload.qualifiedId)}:${payload.meetingStartTime}`;

/**
 * Presents a meeting reminder as an OS/browser notification.
 *
 * This is a sink for the reminder scheduler, not a second timer: the scheduler already decides
 * when a reminder is due, that it fires once per occurrence, and that rescheduling or cancelling
 * a meeting moves or drops it. The OS toast is additive to the in-app notification card, so every
 * failure here is logged and dropped rather than propagated.
 */
export const createMeetingReminderOsNotifier = ({
  notificationApi,
  openMeetingsList,
  formatMeetingTime,
  translate,
  logger,
}: CreateMeetingReminderOsNotifierDependencies): MeetingReminderOsNotifier => {
  const openNotifications = new Map<string, MeetingReminderNotificationHandle>();

  const closeAndForget = (tag: string): void => {
    Maybe.of(openNotifications.get(tag)).inspect(handle => {
      openNotifications.delete(tag);

      handle.close().inspectErr(error => {
        logger.warn('failed to close meeting reminder OS notification', {error, tag});
      });
    });
  };

  return {
    notify: payload => {
      if (!notificationApi.isSupported()) {
        logger.info('skipping meeting reminder OS notification because notifications are unsupported');
        return;
      }

      // A reminder is never worth a permission prompt of its own: the in-app card already
      // carries it. We only present when permission is already granted.
      if (notificationApi.getPermission() !== grantedPermission) {
        logger.info('skipping meeting reminder OS notification because permission is not granted');
        return;
      }

      const tag = toMeetingReminderNotificationTag(payload);
      const shownNotification = notificationApi.show({
        title: payload.meetingTitle,
        body: translate('meetings.notifications.startsAt', {time: formatMeetingTime(payload.meetingStartTime)}),
        tag,
        onClick: () => {
          // WPB-28121 will additionally open the meeting prep modal from here. Until it ships,
          // focusing Wire on the meetings list is the whole click behaviour.
          openMeetingsList();
          closeAndForget(tag);
        },
      });

      if (result.isErr(shownNotification)) {
        logger.warn('failed to present meeting reminder OS notification', {error: shownNotification.error, tag});
        return;
      }

      openNotifications.set(tag, shownNotification.value);
    },
    stop: () => {
      for (const tag of [...openNotifications.keys()]) {
        closeAndForget(tag);
      }
    },
  };
};

export const createBrowserMeetingReminderNotificationApi = (): MeetingReminderNotificationApi => ({
  isSupported: () => Runtime.isSupportingNotifications(),
  getPermission: () => window.Notification.permission,
  show: ({title, body, tag, onClick}) =>
    result.tryOrElse(
      () => meetingReminderNotificationErrors.presentationFailed,
      () => {
        const notification = new window.Notification(title, {body, tag});

        notification.onclick = () => {
          window.focus();
          onClick();
        };

        return {
          close: () =>
            result.tryOrElse(
              () => meetingReminderNotificationErrors.closeFailed,
              () => {
                notification.close();
              },
            ),
        };
      },
    ),
});
