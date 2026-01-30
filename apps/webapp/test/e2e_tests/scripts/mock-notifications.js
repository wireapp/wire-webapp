if (!wire?.app?.repository?.notifications) return;

window.__wireNotifications ||= [];

// Mock the push function of the notifications array
wire.app.repository.notifications.push = (...notifications) => {
  // Every time one or more notifications are pushed to the array also keep a reference to them in the global variable
  window.__wireNotifications.push(...notifications);

  // Use the native push function of the prototype to not modify the behavior
  Array.prototype.push.apply(wire.app.repository.notifications, notifications);
};
