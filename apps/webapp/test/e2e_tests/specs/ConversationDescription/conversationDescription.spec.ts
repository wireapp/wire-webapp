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
 *
 */

import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test, expect, withLogin, Team} from 'test/e2e_tests/test.fixtures';
import {createGroup} from 'test/e2e_tests/utils/userActions';

test.describe('Conversation Description', () => {
  let team: Team;
  let userA: User;
  let userB: User;
  const groupName = 'Description Test Group';

  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser();
    team = await createTeam('Desc Team', {users: [userB]});
    userA = team.owner;
  });

  const openConversationDetails = async (pages: PageManager['webapp']['pages']) => {
    await pages.conversationList().getConversation(groupName).open();
    await pages.conversation().clickConversationInfoButton();
    await pages.conversationDetails().waitForSidebar();
  };

  test(
    'I want to see the description section with a placeholder in a new group conversation',
    {tag: ['@regression']},
    async ({createPage}) => {
      const userAPages = await PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages);

      await createGroup(userAPages, groupName, [userB]);
      await openConversationDetails(userAPages);

      const details = userAPages.conversationDetails();

      await expect(details.descriptionSection).toBeVisible();
      await expect(details.descriptionHeading).toBeVisible();
      await expect(details.descriptionContent).toContainText('Enter a description');
    },
  );

  test(
    'I want to set a description for a group conversation',
    {tag: ['@regression']},
    async ({createPage}) => {
      const userAPages = await PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages);
      const description = 'This is a test description for the group';

      await createGroup(userAPages, groupName, [userB]);
      await openConversationDetails(userAPages);

      const details = userAPages.conversationDetails();

      await details.setDescription(description);

      await expect(details.descriptionContent).toContainText(description);
      await expect(details.descriptionTextarea).not.toBeVisible();
    },
  );

  test(
    'I want to edit an existing description',
    {tag: ['@regression']},
    async ({createPage}) => {
      const userAPages = await PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages);
      const originalDescription = 'Original description';
      const updatedDescription = 'Updated description';

      await createGroup(userAPages, groupName, [userB]);
      await openConversationDetails(userAPages);

      const details = userAPages.conversationDetails();

      // Set initial description
      await details.setDescription(originalDescription);
      await expect(details.descriptionContent).toContainText(originalDescription);

      // Edit the description
      await details.setDescription(updatedDescription);
      await expect(details.descriptionContent).toContainText(updatedDescription);
    },
  );

  test(
    'I want to cancel editing a description with Escape',
    {tag: ['@regression']},
    async ({createPage}) => {
      const userAPages = await PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages);
      const description = 'Should not change';

      await createGroup(userAPages, groupName, [userB]);
      await openConversationDetails(userAPages);

      const details = userAPages.conversationDetails();

      // Set initial description
      await details.setDescription(description);

      // Start editing, type something, then cancel
      await details.descriptionContent.click();
      await details.descriptionTextarea.fill('This will be discarded');
      await details.descriptionTextarea.press('Escape');

      // Verify original description is preserved
      await expect(details.descriptionTextarea).not.toBeVisible();
      await expect(details.descriptionContent).toContainText(description);
    },
  );

  test(
    'I want the description to persist after reopening conversation details',
    {tag: ['@regression']},
    async ({createPage}) => {
      const userAPages = await PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages);
      const description = 'Persistent description';

      await createGroup(userAPages, groupName, [userB]);
      await openConversationDetails(userAPages);

      const details = userAPages.conversationDetails();

      // Set description
      await details.setDescription(description);
      await expect(details.descriptionContent).toContainText(description);

      // Close and reopen the panel
      await userAPages.conversation().clickConversationInfoButton();
      await userAPages.conversation().clickConversationInfoButton();
      await details.waitForSidebar();

      // Verify description persists
      await expect(details.descriptionContent).toContainText(description);
    },
  );

  test(
    'I want to see the edit icon when hovering over the description',
    {tag: ['@regression']},
    async ({createPage}) => {
      const userAPages = await PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages);
      const description = 'Hover test description';

      await createGroup(userAPages, groupName, [userB]);
      await openConversationDetails(userAPages);

      const details = userAPages.conversationDetails();

      await details.setDescription(description);

      // Edit icon should not be visible before hover
      await expect(details.descriptionEditIcon).not.toBeVisible();

      // Hover over the description section
      await details.descriptionSection.hover();

      // Edit icon should appear
      await expect(details.descriptionEditIcon).toBeVisible();
    },
  );

  test(
    'I want to enter edit mode by clicking the edit icon',
    {tag: ['@regression']},
    async ({createPage}) => {
      const userAPages = await PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages);
      const description = 'Edit icon test';

      await createGroup(userAPages, groupName, [userB]);
      await openConversationDetails(userAPages);

      const details = userAPages.conversationDetails();

      await details.setDescription(description);

      // Hover and click edit icon
      await details.descriptionSection.hover();
      await details.descriptionEditIcon.click();

      // Textarea should appear with current description
      await expect(details.descriptionTextarea).toBeVisible();
      await expect(details.descriptionTextarea).toHaveValue(description);
    },
  );
});
