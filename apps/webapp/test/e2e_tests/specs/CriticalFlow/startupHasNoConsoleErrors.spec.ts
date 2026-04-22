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

import {expect, test, type ConsoleMessage, type Page} from '@playwright/test';
import is from '@sindresorhus/is';

import {PageManager} from 'test/e2e_tests/pageManager';

type ConsoleErrorRecord = {
  readonly message: string;
  readonly location: string;
};

type StartupErrorCollection = {
  readonly pageErrors: string[];
  readonly consoleErrors: ConsoleErrorRecord[];
};

function formatConsoleMessageLocation(consoleMessage: ConsoleMessage): string {
  const location = consoleMessage.location();

  if (is.emptyString(location.url)) {
    return 'unknown location';
  }

  return `${location.url}:${location.lineNumber}:${location.columnNumber}`;
}

function collectUnexpectedConsoleErrors(page: Page): StartupErrorCollection {
  const pageErrors: string[] = [];
  const consoleErrors: ConsoleErrorRecord[] = [];

  page.on('pageerror', error => {
    pageErrors.push(error.stack ?? error.message);
  });

  page.on('console', consoleMessage => {
    if (consoleMessage.type() !== 'error') {
      return;
    }

    consoleErrors.push({
      message: consoleMessage.text(),
      location: formatConsoleMessageLocation(consoleMessage),
    });
  });

  return {pageErrors, consoleErrors};
}

function formatCollectedErrors(pageErrors: string[], consoleErrors: ConsoleErrorRecord[]): string {
  const formattedPageErrors = pageErrors.map(error => {
    return `pageerror: ${error}`;
  });
  const formattedConsoleErrors = consoleErrors.map(consoleError => {
    return `console.error: ${consoleError.message} (${consoleError.location})`;
  });

  return [...formattedPageErrors, ...formattedConsoleErrors].join('\n\n');
}

test('Application startup does not emit uncaught runtime errors', {tag: ['@crit-flow-web']}, async ({page}) => {
  const {pageErrors, consoleErrors} = collectUnexpectedConsoleErrors(page);
  const pageManager = PageManager.from(page);

  await test.step('Application renders the bootstrap entry page', async () => {
    await pageManager.openMainPage();
    await expect(pageManager.webapp.pages.singleSignOn().header).toBeVisible();
    await expect(pageManager.webapp.pages.singleSignOn().ssoSignInButton).toBeVisible();
  });

  await test.step('No uncaught runtime errors were emitted during startup', async () => {
    const formattedErrors = formatCollectedErrors(pageErrors, consoleErrors);
    const expectationMessage = is.emptyString(formattedErrors)
      ? 'Unexpected startup errors were emitted:\n\nNo errors were captured.'
      : `Unexpected startup errors were emitted:\n\n${formattedErrors}`;

    expect({pageErrors, consoleErrors}, expectationMessage).toEqual({pageErrors: [], consoleErrors: []});
  });
});
