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

import {getUser} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {setupBasicTestScenario} from 'test/e2e_tests/utils/setup.util';
import {tearDownAll} from 'test/e2e_tests/utils/tearDown.util';
import {createGroup, loginUser} from 'test/e2e_tests/utils/userActions';

import {test, expect} from '../../test.fixtures';

test.describe('Accessibility', () => {
  test.slow();

  let owner = getUser();
  const members = Array.from({length: 2}, () => getUser());
  const [memberA, memberB] = members;
  const teamName = 'Accessibility';
  const conversationName = 'AccTest';
  const textMessage = 'long text message';
  const narrowViewport = {width: 480, height: 800};
  const loginTimeOut = 60_000;

  test.beforeAll(async ({api}) => {
    const user = await setupBasicTestScenario(api, members, owner, teamName);
    owner = {...owner, ...user};
  });

  const navigateToConversation = async (pageManager: PageManager, name: string) => {
    await pageManager.webapp.pages.conversationList().openConversation(name);
  };

  test(
    'I want to see typing indicator in group conversation',
    {tag: ['@TC-46', '@regression']},
    async ({pageManager: memberPageManagerA, browser}) => {
      const memberContext = await browser.newContext();
      const memberPage = await memberContext.newPage();
      const memberPageManagerB = new PageManager(memberPage);

      const toggleTypingIndicator = async (pageManager: PageManager) => {
        await pageManager.webapp.components.conversationSidebar().clickPreferencesButton();
        await pageManager.webapp.pages.account().toggleTypingIndicator();
        await pageManager.webapp.components.conversationSidebar().clickAllConversationsButton();
      };

      const typeAndCheckIndicator = async (
        senderPage: PageManager,
        receiverPage: PageManager,
        message: string,
        expectedState: boolean,
      ) => {
        await senderPage.webapp.pages.conversation().typeMessage(message);
        // Wait for a short moment for the indicator to appear/disappear
        await senderPage.waitForTimeout(800);
        const isVisible = await receiverPage.webapp.pages.conversation().isTypingIndicator.isVisible();
        expect(isVisible).toBe(expectedState);
      };

      // Initial setup
      await memberPageManagerA.openMainPage();
      await memberPageManagerB.openMainPage();
      await loginUser(memberA, memberPageManagerA);
      await loginUser(memberB, memberPageManagerB);

      await memberPageManagerA.webapp.components
        .conversationSidebar()
        .personalUserName.waitFor({state: 'visible', timeout: loginTimeOut});

      await memberPageManagerA.webapp.modals.dataShareConsent().clickDecline();
      await memberPageManagerB.webapp.modals.dataShareConsent().clickDecline();

      await createGroup(memberPageManagerA, conversationName, [memberB]);

      await navigateToConversation(memberPageManagerA, conversationName);
      await navigateToConversation(memberPageManagerB, conversationName);

      await test.step('User A starts typing in group and B sees typing indicator', async () => {
        await typeAndCheckIndicator(memberPageManagerA, memberPageManagerB, textMessage, true);
      });

      await test.step('User A starts typing in group and B does not see typing indicator', async () => {
        // Disable typing indicator for user A
        await toggleTypingIndicator(memberPageManagerA);
        await navigateToConversation(memberPageManagerA, conversationName);

        await typeAndCheckIndicator(memberPageManagerA, memberPageManagerB, textMessage, false);

        // Re-enable typing indicator for user A for subsequent tests
        await toggleTypingIndicator(memberPageManagerA);
        await navigateToConversation(memberPageManagerA, conversationName);
      });

      await test.step('User B turns indicator off and does not see typing indicator', async () => {
        // Disable typing indicator for user B
        await toggleTypingIndicator(memberPageManagerB);
        await navigateToConversation(memberPageManagerB, conversationName);

        await typeAndCheckIndicator(memberPageManagerA, memberPageManagerB, textMessage, false);
      });

      await test.step('User B turns indicator on again and sees typing indicator', async () => {
        // Re-enable typing indicator for user B
        await toggleTypingIndicator(memberPageManagerB);
        await navigateToConversation(memberPageManagerB, conversationName);

        await typeAndCheckIndicator(memberPageManagerA, memberPageManagerB, textMessage, true);
      });
    },
  );

  test('I want to see collapsed view when app is narrow', {tag: ['@TC-48', '@regression']}, async ({pageManager}) => {
    await (await pageManager.getPage()).setViewportSize(narrowViewport);

    await pageManager.openMainPage();
    await loginUser(memberA, pageManager);
    const {components, modals} = pageManager.webapp;

    await components.conversationSidebar().sidebar.waitFor({state: 'visible', timeout: loginTimeOut});
    await modals.dataShareConsent().clickDecline();

    await expect(components.conversationSidebar().sidebar).toHaveAttribute('data-is-collapsed', 'true');
  });

  test(
    'I should not lose a drafted message when switching between conversations in collapsed view',
    {tag: ['@TC-51', '@regression']},
    async ({pageManager}) => {
      const message = 'test';

      await pageManager.openMainPage();
      await loginUser(memberA, pageManager);
      const {components, modals, pages} = pageManager.webapp;
      await components.conversationSidebar().sidebar.waitFor({state: 'visible', timeout: loginTimeOut});
      await modals.dataShareConsent().clickDecline();

      await createGroup(pageManager, conversationName, [memberB]);

      await pages.conversation().typeMessage(message);
      const page = await pageManager.getPage();

      await components.conversationSidebar().clickConnectButton();

      await page.locator('[data-uie-name="highlighted"]').nth(0).click();
      await modals.userProfile().clickStartConversation();
      await expect(page.locator('[data-uie-name="secondary-line"]')).toHaveText(message);

      await pages.conversationList().openConversation(memberB.fullName);

      await pages.conversationList().openConversation(conversationName);
      await expect(await pages.conversation().messageInput).toHaveText(message);
    },
  );

  test.afterAll(async ({api}) => {
    await tearDownAll(api);
  });
});
