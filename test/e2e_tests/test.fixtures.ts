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

import {test as baseTest} from '@playwright/test';

import {Backend} from './backend/backend';

// Define custom test type with axios fixture
type Fixtures = {
  api: Backend;
};

export const test = baseTest.extend<Fixtures>({
  api: async ({request}, use) => {
    // Create a new instance of Backend for each test
    await use(new Backend());
  },
});

export {expect} from '@playwright/test';
