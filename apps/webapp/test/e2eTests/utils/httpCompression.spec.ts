/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
 */

import {expect, test as baseTest} from '@playwright/test';
import {isNull, isString} from '@sindresorhus/is';
import {once} from 'node:events';
import {createServer} from 'node:http';

type HeaderServerFixtures = {
  readonly headerServerUrl: string;
};

const expectedAcceptEncoding = process.env.GITHUB_ACTIONS === 'true' ? /^identity$/ : /\bgzip\b/;

const test = baseTest.extend<HeaderServerFixtures>({
  headerServerUrl: async ({}, use) => {
    const server = createServer((request, response) => {
      response.setHeader('Content-Type', 'text/plain');
      response.end(request.headers['accept-encoding'] ?? '');
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');

    try {
      const address = server.address();
      if (isNull(address)) {
        throw new Error('Header test server has no listening address');
      }
      if (isString(address)) {
        throw new Error('Header test server requires a TCP port');
      }

      await use(`http://127.0.0.1:${address.port}`);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close(error => {
          if (error !== undefined) {
            reject(error);

            return;
          }
          resolve();
        });
      });
    }
  },
});

// The existing CI selects tests by tag; retain coverage for this infrastructure check.
test.describe('HTTP compression request headers', {tag: ['@regression']}, () => {
  test('standard page sends the expected Accept-Encoding', async ({page, headerServerUrl}) => {
    const response = await page.goto(headerServerUrl);

    expect(await response?.text()).toMatch(expectedAcceptEncoding);
  });

  test('manual context inherits the expected Accept-Encoding', async ({browser, headerServerUrl}) => {
    const context = await browser.newContext();

    try {
      const page = await context.newPage();
      const response = await page.goto(headerServerUrl);

      expect(await response?.text()).toMatch(expectedAcceptEncoding);
    } finally {
      await context.close();
    }
  });
});
