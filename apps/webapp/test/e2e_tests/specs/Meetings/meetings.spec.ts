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

import type {Page} from '@playwright/test';

import {PageManager} from 'test/e2e_tests/pageManager';
import {expect, LOGIN_TIMEOUT, test} from 'test/e2e_tests/test.fixtures';

const loginWithMeetingsEnabled = (user: {email: string; password: string}) => async (page: Page) => {
  const pageManager = PageManager.from(page);
  const {pages, components} = pageManager.webapp;
  await pageManager.openLoginPage();
  await pages.login().login(user);
  await components.conversationSidebar().sidebar.waitFor({state: 'visible', timeout: LOGIN_TIMEOUT});
  const clientUrl = new URL('/?enabled-features=meetings#/clients', page.url());
  await page.goto(clientUrl.href, {waitUntil: 'domcontentloaded'});
  await expect.poll(() => new URL(page.url()).searchParams.get('enabled-features')).toBe('meetings');
  await components.conversationSidebar().sidebar.waitFor({state: 'visible', timeout: LOGIN_TIMEOUT});
};

test('single participant meeting notification', async ({createUser, createTeam, createPage}) => {
  const member = await createUser();
  const team = await createTeam('Meetings', {users: [member], features: {meetings: true}});
  const owner = team.owner;

  const [ownerPage, memberPage] = await Promise.all([
    createPage(loginWithMeetingsEnabled(owner)),
    createPage(loginWithMeetingsEnabled(member)),
  ]);

  await ownerPage.locator('[data-uie-name="go-meetings"]').click();
  await ownerPage.locator('[data-uie-name="schedule-meeting"]').click();

  const modal = ownerPage.locator('[data-uie-name="schedule-meeting-modal"]');
  await modal.locator('[data-uie-name="schedule-meeting-title"]').fill('Single participant meeting');

  const participants = modal.locator('[data-uie-name="schedule-meeting-participants"]');
  await participants.locator('[data-uie-name="schedule-meeting-participants-input"]').fill(member.fullName);
  await ownerPage.locator('[data-uie-name="item-user"]').filter({hasText: member.fullName}).click();

  await modal.locator('[data-uie-name="schedule-meeting-modal-submit"]').click();

  const host = memberPage.locator('[data-uie-name="meeting-notification-host"]');
  await expect.poll(() => host.count(), {timeout: 30_000}).toBe(1);
  await expect(host).toBeVisible();
  await host.getByRole('button', {name: 'Expand'}).click();

  const cards = host.locator('[data-uie-name^="meeting-notification-card-"]');
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText('Update: Single participant meeting');
});
