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

import {test as baseTest, type BrowserContext, type Page} from '@playwright/test';

import {ApiManagerE2E} from './backend/apiManager.e2e';
import {getUser, User} from './data/user';
import {PageManager} from './pageManager';

// Define custom test type with axios fixture
type Fixtures = {
  api: ApiManagerE2E;
  pageManager: PageManager;
  createPage: () => Promise<Page>;
  createUser: () => Promise<User>;
};

export const test = baseTest.extend<Fixtures>({
  api: async ({}, use) => {
    // Create a new instance of ApiManager for each test
    await use(new ApiManagerE2E());
  },
  pageManager: async ({page}, use) => {
    // Create a new instance of PageManager for each test
    await use(new PageManager(page));
  },
  createPage: async ({browser}, use) => {
    const contexts: BrowserContext[] = [];

    await use(async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      return page;
    });

    // Close all contexts created throughout the tests (will automatically close all pages associated with each context)
    await Promise.all(contexts.map(ctx => ctx.close()));
  },
  createUser: async ({api}, use) => {
    const users: User[] = [];

    await use(async () => {
      const user = getUser();
      await api.createPersonalUser(user);
      users.push(user);
      return user;
    });

    await Promise.all(users.map(user => api.deletePersonalUser(user)));
  },
});

export {expect} from '@playwright/test';
