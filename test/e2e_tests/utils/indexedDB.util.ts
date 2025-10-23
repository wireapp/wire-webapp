/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {Page} from '@playwright/test';
/**
 * Checks if ANY IndexedDB databases exist in the current browser context.
 * This is used when database names are randomly generated (e.g., UUIDs).
 * * @param page The Playwright Page object.
 * @returns A Promise that resolves to true if ONE or MORE DBs exist, otherwise false.
 */
export const checkAnyIndexedDBExists = async (page: Page): Promise<boolean> => {
  // The logic is executed directly inside the browser environment
  return page.evaluate(async () => {
    // Fallback for older browsers (though unlikely in modern Playwright tests)
    if (!indexedDB.databases) {
      console.error('Browser does not support indexedDB.databases(). Cannot check for existence.');
      return false;
    }

    try {
      // Retrieve a list of all existing databases for the current origin
      const dbs = await indexedDB.databases();

      // Return true if the list of databases is not empty
      return dbs.length > 0;
    } catch (error) {
      // Handle potential errors (e.g., security restrictions)
      console.error('Error retrieving IndexedDB list:', error);
      return false;
    }
  });
};
