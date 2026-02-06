declare global {
  interface Window {
    __wireNotifications: (typeof window)['wire']['app']['repository']['notification']['notifications'];
  }
}

export const mockNotifications = () => {
  if (!window.wire?.app?.repository?.notification?.notifications) return;

  window.__wireNotifications ||= [];

  // Mock the push function of the notifications array
  window.wire.app.repository.notification.notifications.push = (...notifications) => {
    // Every time one or more notifications are pushed to the array also keep a reference to them in the global variable
    window.__wireNotifications.push(...notifications);

    // Use the native push function of the prototype to not modify the behavior
    return Array.prototype.push.apply(window.wire.app.repository.notification.notifications, notifications);
  };
};

// Maybe try to just re-use the current notifications array and just search it from playwright? <- Issue would be that notifications could disappear from it...
