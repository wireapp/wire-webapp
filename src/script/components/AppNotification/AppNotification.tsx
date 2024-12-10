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

// import {useCallback, useEffect, useRef, useState} from 'react';

// import {createRoot} from 'react-dom/client';

// import * as Icon from 'Components/Icon';

// import {buttonStyles, closeIcon, content, wrapper} from './AppNotification.styles';

// const DEFAULT_NOTIFICATION_TIMEOUT = 3000;
// const ANIMATION_DURATION = 300;
// const APP_NOTIFICATION_SELECTOR = '#app-notification';

// interface AppNotificationProps {
//   message: string;
//   onClose: () => void;
//   notificationTimeout?: number;
// }

// export const AppNotification = ({
//   message,
//   onClose,
//   notificationTimeout = DEFAULT_NOTIFICATION_TIMEOUT,
// }: AppNotificationProps) => {
//   const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//   const [isAnimated, setIsAnimated] = useState(false);
//   const [isClosing, setIsClosing] = useState(false);

//   const handleCloseNotification = useCallback(() => {
//     closeTimeoutRef.current = setTimeout(() => {
//       setIsClosing(true);
//       setTimeout(() => {
//         onClose();
//       }, ANIMATION_DURATION);
//     }, notificationTimeout - ANIMATION_DURATION);
//   }, [notificationTimeout, onClose]);

//   useEffect(() => {
//     setIsAnimated(true);
//     handleCloseNotification();

//     return () => {
//       if (closeTimeoutRef.current) {
//         clearTimeout(closeTimeoutRef.current);
//       }
//     };
//   }, [handleCloseNotification]);

//   return (
//     <div css={{...wrapper, top: isAnimated && !isClosing ? '50px' : '0', opacity: !isAnimated || isClosing ? 0 : 1}}>
//       <div css={content}>{message}</div>

//       <button css={buttonStyles} onClick={onClose}>
//         <Icon.CloseIcon css={closeIcon} />
//       </button>
//     </div>
//   );
// };

export const showAppNotification = (message: string) => {
  const appNotificationContainer = document.querySelector(APP_NOTIFICATION_SELECTOR);

  if (!appNotificationContainer) {
    return;
  }

  const root = createRoot(appNotificationContainer);
  const closeNotification = () => root.unmount();

  root.render(<AppNotification message={message} onClose={closeNotification} />);
};

// export const createAppNotification = ({message, closeAfterMs}: {message: string; closeAfterMs?: number}) => {
//   const appNotificationContainer = document.querySelector(APP_NOTIFICATION_SELECTOR);
//   let isShown: boolean;

//   if (!appNotificationContainer) {
//     throw new Error('appNotificationContainer is not defined');
//   }

//   const root = createRoot(appNotificationContainer);
//   const closeNotification = () => root.unmount();

//   return {
//     show: () => {
//       if (isShown) {
//         return;
//       }
//       root.render(<AppNotification message={message} onClose={closeNotification} notificationTimeout={closeAfterMs} />);
//       isShown = true;
//     },
//     close: () => {
//       closeNotification();
//       isShown = false;
//     },
//   };
// };

import {useState, useCallback, useEffect} from 'react';

import {createRoot} from 'react-dom/client';

import * as Icon from 'Components/Icon';

const DEFAULT_NOTIFICATION_TIMEOUT = 3000;
const ANIMATION_DURATION = 300;
const APP_NOTIFICATION_SELECTOR = '#app-notification';

interface NotificationItem {
  id: string;
  message: string;
  timeout: number | null;
}

interface AppNotificationProps extends NotificationItem {
  onClose: (id: string) => void;
  isClosing?: boolean;
  index: number;
}

const AppNotification = ({
  id,
  message,
  timeout = DEFAULT_NOTIFICATION_TIMEOUT,
  onClose,
  isClosing = false,
  index,
}: AppNotificationProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);

    if (typeof timeout === 'number') {
      const timer = setTimeout(() => onClose(id), timeout - ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [timeout, onClose, id]);

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

const NotificationContainer = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [closingNotificationIds, setClosingNotificationIds] = useState<string[]>([]);

  const handleClose = useCallback((id: string) => {
    setClosingNotificationIds(prev => [...prev, id]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(notification => notification.id !== id));
      setClosingNotificationIds(prev => prev.filter(closingId => closingId !== id));
    }, ANIMATION_DURATION);
  }, []);

  useEffect(() => {
    globalNotificationManager = {
      show: (id: string, message: string, timeout?: number | null) => {
        if (message) {
          const newNotification: NotificationItem = {
            id,
            message,
            timeout: timeout ?? DEFAULT_NOTIFICATION_TIMEOUT,
          };
          setNotifications(prev => [...prev, newNotification]);
        }
      },
      close: (id: string) => {
        handleClose(id);
      },
    };
  }, [handleClose]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notifications-container">
      {notifications.map((notification, index) => (
        <AppNotification
          key={notification.id}
          {...notification}
          onClose={handleClose}
          isClosing={closingNotificationIds.includes(notification.id)}
          index={index}
        />
      ))}
    </div>
  );
};

let root: ReturnType<typeof createRoot> | null = null;
let globalNotificationManager: {
  show: (id: string, message: string, timeout?: number | null) => void;
  close: (id: string) => void;
} | null = null;
let previousActiveWindow: Window;

export const createAppNotification = ({
  id,
  message,
  timeout,
  activeWindow = window,
}: {
  id: string;
  message: string;
  timeout?: number | null;
  activeWindow?: Window;
}) => {
  const notificationContainer = activeWindow.document.querySelector(APP_NOTIFICATION_SELECTOR);

  if (!notificationContainer) {
    console.warn(`Notification container with selector ${APP_NOTIFICATION_SELECTOR} not found.`);
    return null;
  }

  if (!root || previousActiveWindow.name !== activeWindow.name) {
    previousActiveWindow = activeWindow;
    root = createRoot(notificationContainer);
    root.render(<NotificationContainer />);
  }

  return {
    show: () => {
      globalNotificationManager?.show(id, message, timeout);
    },
    close: () => {
      globalNotificationManager?.close(id);
    },
  };
};
