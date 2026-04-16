import {test, expect, type Page} from 'playwright/test';

declare global {
  interface Window {
    // Declare the custom variable used to store the intercepted notifications on the window object
    __wireNotifications: (typeof window)['wire']['app']['repository']['notification']['notifications'];
  }
}

/**
 * Browser script to intercept all sent notifications and store them in a global variable for later use.
 *
 * **Important**: Don't use this function within playwright directly, only in the browser e.g. within `page.evaluate()`.
 */
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

/**
 * Retrieve the notifications stored in the global variable of the page's window.
 * The function serializes the important properties of the Notification object to pass them to the playwright environment.
 */
const getNotifications = async (page: Page) => {
  return await page.evaluate(() =>
    /**
     * It's necessary to construct a new object containing the important properties of the notification
     * since the class would otherwise be serialized as empty object.
     */
    window.__wireNotifications.map(notification => ({
      title: notification.title,
      body: notification.body,
      data: notification.data,
      icon: notification.icon,
    })),
  );
};

/** Search for a notification matching the given parameters and click it */
const clickNotification = async (
  page: Page,
  notification: {title?: string; body?: string},
  options?: {timeout?: number},
) => {
  // Create a boxed test step so this action shows up like a normal one in the trace viewer
  await test.step(
    `Click notification ${JSON.stringify(notification)}`,
    async () => {
      // Wrap action with expect to have it retry automatically using global default timeouts
      await expect(async () => {
        const notifications = await getNotifications(page);

        // Find a notification matching the given properties
        const index = notifications.findIndex(
          n =>
            // Ignore the property if it's undefined
            (notification.title !== undefined ? n.title === notification.title : true) &&
            (notification.body !== undefined ? n.body === notification.body : true),
        );

        if (index < 0)
          throw new Error(
            `Can't click notification ${JSON.stringify(notification)} as it doesn't exist in:\n\n${JSON.stringify(notifications, undefined, 2)}`,
          );

        // If found trigger its "onclick" callback
        await page.evaluate(index => window.__wireNotifications.at(index)?.onclick?.(new Event('click')), index);
      }).toPass({timeout: options?.timeout, intervals: [1_000]});
    },
    {box: true},
  );
};

/**
 * Start intercepting the notifications pushed for the given page.
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
     * Async function to get the notifications the intercepted page received so far.
     * Pass this to `expect.poll()` to avoid flake due to timing issues.
     */
    getNotifications: getNotifications.bind(undefined, page),
    /**
     * Search for a notification matching the given parameters and click it
     *
     * Note: This function won't retry automatically, ensure the notification exists before calling it
     */
    clickNotification: clickNotification.bind(undefined, page),
  };
};
