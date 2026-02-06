import {type Page} from 'playwright/test';

declare global {
  interface Window {
    // Declare the custom variable used to store the intercepted notifications on the window object
    __wireNotifications: (typeof window)['wire']['app']['repository']['notification']['notifications'];
  }
}

const stubNotifications = () => {
  if (!window.wire?.app?.repository?.notification?.notifications)
    throw new Error("Can't stub notifications - Notifications array wasn't initialized yet");

  window.__wireNotifications ??= [];

  // Mock the push function of the notifications array
  window.wire.app.repository.notification.notifications.push = (...notifications) => {
    // Every time one or more notifications are pushed to the array also keep a reference to them in the global variable
    window.__wireNotifications.push(...notifications);

    // Use the native push function of the prototype to not modify the behavior
    return Array.prototype.push.apply(window.wire.app.repository.notification.notifications, notifications);
  };
};

const getNotifications = async (page: Page) => {
  return await page.evaluate(() =>
    /**
     * It's necessary to construct a new object containing the important properties of the notification
     * since the class would otherwise be serialized as empty object.
     */
    window.__wireNotifications.map(n => ({
      title: n.title,
      body: n.body,
      data: n.data,
    })),
  );
};

/**
 * Start intercepting the notifications pushed for the given page
 * @example
 * ```ts
 * const { getNotifications } = await interceptNotifications(userBPage);
 *
 * // Send a notification to userB
 *
 * await expect.poll(() => getNotifications()).toHaveLength(1):
 * ```
 */
export const interceptNotifications = async (page: Page) => {
  await page.evaluate(stubNotifications);

  return {
    /**
     * Async function to get the notifications the intercepted page received so far
     * Pass this to `expect.poll()` to avoid flake due to timing issues.
     */
    getNotifications: () => getNotifications(page),
  };
};
