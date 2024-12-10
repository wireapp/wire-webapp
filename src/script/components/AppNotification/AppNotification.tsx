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

export const showAppNotification = (message: string) => {};

import {useState, useCallback, useEffect} from 'react';

import {createRoot} from 'react-dom/client';

import * as Icon from 'Components/Icon';

const DEFAULT_NOTIFICATION_TIMEOUT = 3000;
const ANIMATION_DURATION = 300;
const APP_NOTIFICATION_SELECTOR = '#app-notification';

type NotificationManager = {show: (notification: Notification) => void; close: (id: string) => void} | null;

let root: ReturnType<typeof createRoot> | null = null;

let notificationManager: NotificationManager = null;

let previousActiveWindow: Window;

interface Notification {
  id: string;
  message: string;
  autoClose?: boolean;
  activeWindow?: Window;
}

export const createAppNotification = ({id, message, autoClose, activeWindow = window}: Notification) => {
  const notificationContainer = activeWindow.document.querySelector(APP_NOTIFICATION_SELECTOR);

  if (!notificationContainer) {
    throw new Error(`Notification container with selector ${APP_NOTIFICATION_SELECTOR} not found.`);
  }

  // We don't want to create a new root each time the function is called, instead we create it only once.
  // An exception is when the "active" window changes (e.g. we switch from normal call view, to the detatched window), in which case we need to render the component in a new root, in a new window.
  // Our detatched window has a "name" property, which we can use to check if the window has changed.
  if (!root || previousActiveWindow.name !== activeWindow.name) {
    previousActiveWindow = activeWindow;
    root = createRoot(notificationContainer);
    root.render(<NotificationContainer />);
  }

  return {
    show: () => {
      notificationManager?.show({id, message, autoClose, activeWindow});
    },
    close: () => {
      notificationManager?.close(id);
    },
  };
};

const NotificationContainer = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [closingNotificationIds, setClosingNotificationIds] = useState<string[]>([]);

  const handleClose = useCallback((id: string) => {
    setClosingNotificationIds(prev => [...prev, id]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(notification => notification.id !== id));
      setClosingNotificationIds(prev => prev.filter(closingId => closingId !== id));
    }, ANIMATION_DURATION);
  }, []);

  useEffect(() => {
    notificationManager = {
      show: (notification: Notification) => {
        setNotifications(prev => [...prev, notification]);
      },
      close: (id: string) => {
        handleClose(id);
      },
    };
  }, [handleClose]);

  useEffect(() => {
    return () => {
      notifications.forEach(({id}) => handleClose(id));
    };
  }, [handleClose, notifications]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <section aria-label="Notifications" aria-live="polite" aria-atomic="false" className="notifications-container">
      <ol>
        {notifications.map((notification, index) => (
          <li key={notification.id}>
            <AppNotification
              {...notification}
              onClose={handleClose}
              isClosing={closingNotificationIds.includes(notification.id)}
              index={index}
            />
          </li>
        ))}
      </ol>
    </section>
  );
};

interface AppNotificationProps extends Notification {
  onClose: (id: string) => void;
  isClosing?: boolean;
  index: number;
}

const AppNotification = ({id, message, autoClose, onClose, isClosing = false, index}: AppNotificationProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);

    if (autoClose) {
      const timer = setTimeout(() => onClose(id), DEFAULT_NOTIFICATION_TIMEOUT - ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [onClose, id, autoClose]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="notification"
      style={{
        top: !isClosing ? `${50 + index * (50 + 10)}px` : `${index * (50 + 10)}px`,
        opacity: isClosing ? 0 : 1,
        transition: `all ${ANIMATION_DURATION}ms ease-in-out`,
      }}
    >
      <div className="notification__content">{message}</div>
      <button className="notification__button" onClick={() => onClose(id)}>
        <Icon.CloseIcon className="notification__close-icon" />
      </button>
    </div>
  );
};
