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

import {buttonStyles, closeIcon, content, wrapper} from './AppNotification.styles';

const DEFAULT_NOTIFICATION_TIMEOUT = 3000;
const ANIMATION_DURATION = 300;
const APP_NOTIFICATION_SELECTOR = '#app-notification';

interface AppNotificationProps {
  message: string;
  onClose: () => void;
  notificationTimeout?: number | null;
  isClosing?: boolean;
}

const AppNotification = ({
  message,
  notificationTimeout = DEFAULT_NOTIFICATION_TIMEOUT,
  onClose,
  isClosing = false,
}: AppNotificationProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);

    if (typeof notificationTimeout === 'number') {
      const timer = setTimeout(onClose, notificationTimeout - ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [notificationTimeout, onClose]);

  if (!visible) {
    return null;
  }

  return (
    <div
      css={{
        ...wrapper,
        top: !isClosing ? '50px' : '0',
        opacity: isClosing ? 0 : 1,
        transition: `all ${ANIMATION_DURATION}ms ease-in-out`,
      }}
    >
      <div css={content}>{message}</div>
      <button css={buttonStyles} onClick={onClose}>
        <Icon.CloseIcon css={closeIcon} />
      </button>
    </div>
  );
};

const NotificationContainer = () => {
  const [notification, setNotification] = useState({message: '', timeout: null as number | null});
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setNotification({message: '', timeout: null});
      setIsClosing(false);
    }, ANIMATION_DURATION);
  }, []);

  useEffect(() => {
    globalNotificationManager = (message, timeout) => {
      if (message) {
        setNotification({message, timeout});
        setIsClosing(false);
      } else {
        handleClose();
      }
    };
  }, [handleClose]);

  if (!notification.message) {
    return null;
  }

  return (
    <AppNotification
      message={notification.message}
      notificationTimeout={notification.timeout}
      onClose={handleClose}
      isClosing={isClosing}
    />
  );
};

let root: ReturnType<typeof createRoot> | null = null;
let globalNotificationManager: ((message: string, timeout?: number | null) => void) | null = null;

export const createAppNotification = () => {
  const container = document.querySelector(APP_NOTIFICATION_SELECTOR);

  if (!container) {
    console.warn(`Notification container with selector ${APP_NOTIFICATION_SELECTOR} not found.`);
    return {show: () => {}, close: () => {}};
  }

  if (!root) {
    root = createRoot(container);
    root.render(<NotificationContainer />);
  }

  return {
    show: (message: string, timeout?: number | null) => globalNotificationManager?.(message, timeout),
    close: () => globalNotificationManager?.('', 0),
  };
};
