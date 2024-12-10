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

import React, {createContext, useContext, useState, useCallback, useEffect, ReactNode} from 'react';

import {createRoot} from 'react-dom/client';

interface NotificationContextType {
  show: (id: string, message: string, activeWindow: Window | null, autoClose: boolean) => void;
  close: (id: string, activeWindow: Window | null) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({children}: {children: ReactNode}) => {
  const [notificationsByWindow, setNotificationsByWindow] = useState<{
    [key: string]: Array<{id: string; message: string; autoClose: boolean}>;
  }>({});

  // Generate a window-specific key
  const getWindowKey = (activeWindow: Window | null) => activeWindow?.name || 'default';

  const close = useCallback((id: string, activeWindow: Window | null) => {
    const windowKey = getWindowKey(activeWindow);

    setNotificationsByWindow(prev => {
      const updated = {...prev};
      if (updated[windowKey]) {
        updated[windowKey] = updated[windowKey].filter(notification => notification.id !== id);
      }
      return updated;
    });

    // Find and remove the notification from the container
    const notification = document.getElementById(id);
    if (notification) {
      notification.remove();
    }
  }, []);

  // Show a new notification
  const show = useCallback(
    (id: string, message: string, activeWindow: Window | null, autoClose: boolean) => {
      if (!activeWindow) {
        return;
      }

      const windowKey = getWindowKey(activeWindow);

      const currentNotifications = notificationsByWindow[windowKey] || [];

      const newNotifications = {
        ...notificationsByWindow,
        [windowKey]: [...currentNotifications, {id, message, autoClose}],
      };

      // Update state to add the new notification for the window
      setNotificationsByWindow(newNotifications);

      // Find the notification container in the active window
      const container = activeWindow.document.getElementById('app-notification');
      if (container) {
        // Render all notifications for the window in the container
        const root = createRoot(container);

        root.render(
          <div data-name="wrapper">
            {newNotifications[windowKey]?.map(notif => (
              <Notification
                key={notif.id}
                id={notif.id}
                message={notif.message}
                close={() => close(notif.id, activeWindow)}
              />
            ))}
          </div>,
        );
      }

      if (autoClose) {
        setTimeout(() => close(id, activeWindow), 5000); // Close after 5 seconds
      }
    },
    [notificationsByWindow, close], // We use notificationsByWindow to manage the list of notifications
  );

  // Close a notification

  return <NotificationContext.Provider value={{show, close}}>{children}</NotificationContext.Provider>;
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

  return (
    <div id={id} className="notification">
      <span>{message}</span>
      <button onClick={close}>Close</button>
    </div>
  );
};
