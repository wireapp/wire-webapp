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

import React, {createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef} from 'react';

import {createRoot} from 'react-dom/client';

import * as Icon from 'Components/Icon';

interface NotificationContextType {
  createNotification: (notification: {
    id: string;
    message: string;
    activeWindow: Window | null;
    autoClose: boolean;
  }) => {show: () => void; close: () => void};
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = (notification: {
  id: string;
  message: string;
  activeWindow: Window | null;
  autoClose: boolean;
}) => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context.createNotification(notification);
};

const NotificationCenter = ({
  notifications,
  onClose,
}: {
  notifications: Array<{id: string; message: string; autoClose: boolean}>;
  onClose: (notification: {id: string; message: string; autoClose: boolean}) => void;
}) => {
  return (
    <section>
      <ol>
        {notifications.map((notif, index) => (
          <li key={notif.id}>
            <AppNotification index={index} id={notif.id} message={notif.message} onClose={() => onClose(notif)} />
          </li>
        ))}
      </ol>
    </section>
  );
};

export const NotificationProvider = ({children}: {children: ReactNode}) => {
  const [notificationsByWindow, setNotificationsByWindow] = useState<{
    [key: string]: Array<{id: string; message: string; autoClose: boolean}>;
  }>({});
  const [closingNotificationIdsByWindow, setClosingNotificationIdsByWindow] = useState<{
    [key: string]: string[];
  }>({});

  const rootRef = useRef<{
    [key: string]: ReturnType<typeof createRoot> | null;
  }>({});

  // Generate a window-specific key
  const getWindowKey = (activeWindow: Window | null) => activeWindow?.name || 'default';

  const close = useCallback(
    (id: string, activeWindow: Window | null) => {
      const windowKey = getWindowKey(activeWindow);

      const currentNotifications = notificationsByWindow[windowKey] || [];

      const newNotifications = {
        ...notificationsByWindow,
        [windowKey]: currentNotifications.filter(notification => notification.id !== id),
      };

      setTimeout(() => {
        setNotificationsByWindow(newNotifications);
        rootRef.current[windowKey]?.render(
          <NotificationCenter
            notifications={newNotifications[windowKey]}
            onClose={noti => close(noti.id, activeWindow)}
          />,
        );
      }, 300);
    },
    [notificationsByWindow],
  );

  const show = useCallback(
    (id: string, message: string, activeWindow: Window | null, autoClose: boolean) => {
      if (!activeWindow) {
        return;
      }

      const windowKey = getWindowKey(activeWindow);

      const currentNotifications = notificationsByWindow[windowKey] || [];

      const alreadyShown = currentNotifications.find(notification => notification.id === id);

      if (alreadyShown) {
        return;
      }

      const newNotifications = {
        ...notificationsByWindow,
        [windowKey]: [...currentNotifications, {id, message, autoClose}],
      };

      setNotificationsByWindow(newNotifications);

      const container = activeWindow.document.getElementById('app-notification');

      if (!container) {
        return;
      }

      const root = rootRef.current[windowKey] || createRoot(container);
      rootRef.current[windowKey] = root;

      root.render(
        <NotificationCenter
          notifications={newNotifications[windowKey]}
          onClose={noti => close(noti.id, activeWindow)}
        />,
      );

      if (autoClose) {
        setTimeout(() => close(id, activeWindow), 5000);
      }
    },
    [notificationsByWindow, close],
  );

  const createNotification = ({
    id,
    message,
    autoClose,
    activeWindow,
  }: {
    id: string;
    message: string;
    autoClose: boolean;
    activeWindow: Window | null;
  }) => {
    return {
      show: () => {
        show(id, message, activeWindow, autoClose);
      },
      close: () => {
        close(id, activeWindow);
      },
    };
  };

  // Close a notification

  return <NotificationContext.Provider value={{createNotification}}>{children}</NotificationContext.Provider>;
};

interface NotificationProps {
  id: string;
  message: string;
  close: () => void;
}

const Notification: React.FC<NotificationProps> = ({id, message, close}) => {
  useEffect(() => {
    const timer = setTimeout(() => close(), 5000); // Auto-close after 5 seconds
    return () => clearTimeout(timer);
  }, [close]);
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
      const timer = setTimeout(() => onClose(id), 3000 - 300);
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
        transition: `all ${300}ms ease-in-out`,
      }}
    >
      <div className="notification__content">{message}</div>
      <button className="notification__button" onClick={() => onClose(id)}>
        <Icon.CloseIcon className="notification__close-icon" />
      </button>
    </div>
  );
};
