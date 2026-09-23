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

import {type Result} from 'true-myth';

export const systemNotificationErrorKinds = {
  presentationFailed: 'presentationFailed',
  closeFailed: 'closeFailed',
} as const;

export type SystemNotificationErrorKind =
  (typeof systemNotificationErrorKinds)[keyof typeof systemNotificationErrorKinds];

/** Carries the thrown value along, so a log line says more than which call site failed. */
export type SystemNotificationError = {
  kind: SystemNotificationErrorKind;
  cause: unknown;
};

export const toSystemNotificationError =
  (kind: SystemNotificationErrorKind) =>
  (cause: unknown): SystemNotificationError => ({kind, cause});

/** The three permission states, owned here so the port carries no DOM type. */
export type SystemNotificationPermission = 'default' | 'denied' | 'granted';

export type SystemNotificationRequest = {
  title: string;
  body: string;
  tag: string;
  onClick: () => void;
  /** Called when the platform closed the notification on its own: user dismissal, OS lifecycle or an error. */
  onClose: () => void;
};

export type SystemNotificationHandle = {
  close: () => Result<void, SystemNotificationError>;
};

/**
 * How the application presents an OS notification. Free of DOM types, so a feature can ask for a
 * notification without reaching for `window` and can be tested without a DOM.
 *
 * The adapter behind this port owns the throwing browser boundary and reports failures as a
 * `Result`, which keeps its callers free of exception handling.
 */
export type SystemNotificationApi = {
  isSupported: () => boolean;
  getPermission: () => SystemNotificationPermission;
  show: (request: SystemNotificationRequest) => Result<SystemNotificationHandle, SystemNotificationError>;
};
