/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {useCallback, useEffect, useRef, useState} from 'react';

import {createRoot} from 'react-dom/client';

import * as Icon from 'Components/Icon';

import {buttonStyles, closeIcon, content, wrapper} from './AppNotification.styles';

const DEFAULT_NOTIFICATION_TIMEOUT = 3000;
const ANIMATION_DURATION = 300;
const APP_NOTIFICATION_SELECTOR = '#app-notification';

interface AppNotificationProps {
  message: string;
  onClose: () => void;
  notificationTimeout?: number;
}

export const AppNotification = ({
  message,
  onClose,
  notificationTimeout = DEFAULT_NOTIFICATION_TIMEOUT,
}: AppNotificationProps) => {
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isAnimated, setIsAnimated] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleCloseNotification = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => {
        onClose();
      }, ANIMATION_DURATION);
    }, notificationTimeout - ANIMATION_DURATION);
  }, [notificationTimeout, onClose]);

  useEffect(() => {
    setIsAnimated(true);
    handleCloseNotification();

    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, [handleCloseNotification]);

  return (
    <div css={{...wrapper, top: isAnimated && !isClosing ? '50px' : '0', opacity: !isAnimated || isClosing ? 0 : 1}}>
      <div css={content}>{message}</div>

      <button css={buttonStyles} onClick={onClose}>
        <Icon.CloseIcon css={closeIcon} />
      </button>
    </div>
  );
};

interface Notification {
  message: string;
  notificationTimeout: number;
}

const notificationQueue: Notification[] = [];
let isNotificationVisible = false;

const processQueue = () => {
  if (isNotificationVisible || notificationQueue.length === 0) {
    return;
  }

  const nextNotification = notificationQueue.shift();
  if (!nextNotification) {
    return;
  }

  const {message, notificationTimeout} = nextNotification;

  const appNotificationContainer = document.querySelector(APP_NOTIFICATION_SELECTOR);

  if (!appNotificationContainer) {
    return;
  }

  const root = createRoot(appNotificationContainer);
  const closeNotification = () => {
    isNotificationVisible = false;
    root.unmount();
    processQueue();
  };

  isNotificationVisible = true;
  root.render(
    <AppNotification message={message} notificationTimeout={notificationTimeout} onClose={closeNotification} />,
  );
};

export const showAppNotification = (message: string, notificationTimeout = DEFAULT_NOTIFICATION_TIMEOUT) => {
  const appNotificationContainer = document.querySelector(APP_NOTIFICATION_SELECTOR);

  if (!appNotificationContainer) {
    return;
  }

  notificationQueue.push({message, notificationTimeout});
  processQueue();
};
