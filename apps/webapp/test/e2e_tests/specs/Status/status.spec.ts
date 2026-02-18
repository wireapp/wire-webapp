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

import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test, expect, withConnectedUser, withLogin} from 'test/e2e_tests/test.fixtures';

test.describe('Status', () => {
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createTeam}) => {
    const team = await createTeam('Test Team', {withMembers: 1});
    userA = team.owner;
    userB = team.members[0];
  });

  test('I want to see a popup when I change my status', {tag: ['@TC-8772', '@regression']}, async ({createPage}) => {
    const userAPageManager = await PageManager.from(createPage(withLogin(userA)));
    const {components, modals} = userAPageManager.webapp;

    // User A should have no status after login
    await expect(components.conversationSidebar().personalStatusIcon).not.toBeVisible();
    const statuses = ['Away', 'Busy', 'Available', 'None'] as const;

    for (const status of statuses) {
      const expectedTitle = status === 'None' ? 'No status set' : `You are set to ${status}`;

      await components.conversationSidebar().openStatusMenu(userA.fullName);
      await components.conversationSidebar().setStatus(status);
      await expect(modals.statusChangeModal().modalTitle).toContainText(expectedTitle);

      await modals.statusChangeModal().actionButton.click();
      await expect(modals.statusChangeModal().modalTitle).not.toBeVisible();
    }
  });

  test('I want to set my status on profile page', {tag: ['@TC-1766', '@regression']}, async ({createPage}) => {
    const userAPageManager = await PageManager.from(createPage(withLogin(userA)));
    const userBPages = await PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(
      pm => pm.webapp.pages,
    );
    const {pages, components, modals} = userAPageManager.webapp;

    // User B verify no status is set in conversation list
    await userBPages.conversationList().openConversation(userA.fullName);
    await expect(userBPages.conversationList().getUserStatusIcon(userA)).not.toBeVisible();

    // User A opens preferences by clicking the gear button
    await components.conversationSidebar().clickPreferencesButton();
    // User A verifies status is None in account preferences
    await expect(pages.account().selectedStatus('None')).toBeVisible();
    // User A verifies available status in account preferences are Available, Busy, Away
    await expect(pages.account().statusOption('Available')).toBeVisible();
    await expect(pages.account().statusOption('Busy')).toBeVisible();
    await expect(pages.account().statusOption('Away')).toBeVisible();

    // User A sets status to Available in account preferences
    await pages.account().selectStatus('Available');
    await expect(modals.statusChangeModal().modalTitle).toContainText('You are set to Available');
    await modals.statusChangeModal().actionButton.click();

    // User A verifies is Available in account preferences
    await expect(pages.account().selectedStatus('Available')).toBeVisible();
    await expect(pages.account().selectedStatus('None')).not.toBeVisible();

    // User B verifies status is Available in conversation list
    await expect(userBPages.conversationList().getUserStatusIcon(userA)).toBeVisible();
    await expect(userBPages.conversationList().getUserStatusIcon(userA)).toHaveAttribute('data-uie-value', 'available');
  });
});
