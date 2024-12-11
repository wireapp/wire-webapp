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

import {useEffect, useRef} from 'react';

import {createRoot, Root} from 'react-dom/client';
import {toast, Toaster} from 'sonner';

import * as Icon from 'Components/Icon';

interface UseAppNotificationParams {
  message: string;
  activeWindow?: Window;
  leadingIcon?: React.ElementType<any>;
  withCloseButton?: boolean;
  autoClose?: boolean;
}

const DEFAULT_NOTIFICATION_TIMEOUT = 3000;
const APP_NOTIFICATION_SELECTOR = '#app-notification';

// Stores React roots for different windows (activeWindow).
// Each window (identified by its 'name' property or 'default' if not available) gets its own root.
// This prevents multiple calls to createRoot() for the same container, ensuring a single root per window.
// It's necessary to display notifications in different windows (e.g. main window and detached call window).
let roots: Record<string, Root> = {};

export const useAppNotification = ({
  message,
  activeWindow = window,
  leadingIcon,
  withCloseButton = true,
  autoClose = true,
}: UseAppNotificationParams) => {
  const notificationId = useRef<string | number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => injectToaster(activeWindow));

    return () => {
      clearTimeout(timeout);
      setTimeout(() => clearRoots());
    };
  }, [activeWindow]);

  return {
    show: () => {
      const id = toast.custom(
        toastId => (
          <AppNotification
            message={message}
            leadingIcon={leadingIcon}
            withCloseButton={withCloseButton}
            onClose={() => toast.dismiss(toastId)}
          />
        ),
        {
          duration: autoClose ? DEFAULT_NOTIFICATION_TIMEOUT : Infinity,
          position: 'top-center',
          unstyled: true,
          dismissible: false,
          style: {
            top: 24,
          },
        },
      );
      notificationId.current = id;
    },
    close: () => {
      if (!notificationId.current) {
        return;
      }

      toast.dismiss(notificationId.current);
    },
  };
};

const injectToaster = (activeWindow: Window) => {
  const windowKey = activeWindow.name || 'default';

  if (roots[windowKey]) {
    return;
  }

  const container = activeWindow.document.querySelector(APP_NOTIFICATION_SELECTOR);

  if (!container) {
    throw new Error('Notification container not found!');
  }

  const root = createRoot(container);

  roots[windowKey] = root;

  root.render(<Toaster expand />);
};

// Clear all roots to prevent memory leaks.
// Necessary, when the activeWindow changes (e.g. switching from the main window to the detached call window).
// Without cleaning the roots (unmounting) the <Toaster /> from the DOM note, would be rendered in both windows.
const clearRoots = () => {
  // eslint-disable-next-line id-length
  Object.entries(roots).forEach(([_, rootEntry]) => {
    rootEntry.unmount();
  });
  roots = {};
};

interface AppNotificationProps extends Pick<UseAppNotificationParams, 'message' | 'leadingIcon' | 'withCloseButton'> {
  onClose?: () => void;
}

const AppNotification = ({message, leadingIcon: LeadingIcon, withCloseButton, onClose}: AppNotificationProps) => {
  return (
    <div className="app-notification">
      {LeadingIcon && <LeadingIcon className="app-notification__icon" />}
      <div className="app-notification__content">{message}</div>
      {withCloseButton && (
        <button className="app-notification__button" onClick={onClose}>
          <Icon.CloseIcon className="app-notification__icon" />
        </button>
      )}
    </div>
  );
};
