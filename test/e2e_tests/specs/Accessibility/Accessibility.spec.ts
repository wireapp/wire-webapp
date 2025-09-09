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
import {setupBasicTestScenario} from 'test/e2e_tests/utils/setup.utli';
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

  test.beforeAll(async ({api}) => {
    const user = await setupBasicTestScenario(api, members, owner, teamName);
    owner = {...owner, ...user};
  });

  test(
    'I want to see typing indicator in group conversation',
    {tag: ['@TC-46', '@regression']},
    async ({pageManager: memberPageManagerA, browser}) => {
      const memberContext = await browser.newContext();
      const memberPage = await memberContext.newPage();
      const memberPageManagerB = new PageManager(memberPage);

      const memberAPages = memberPageManagerA.webapp.pages;
      const memberPagesB = memberPageManagerB.webapp.pages;

      // log both in
      await memberPageManagerA.openMainPage();
      await memberPageManagerB.openMainPage();
      await loginUser(memberA, memberPageManagerA);
      await loginUser(memberB, memberPageManagerB);

      // wait for rendered main ui
      await memberPageManagerA.webapp.components
        .conversationSidebar()
        .personalUserName.waitFor({state: 'visible', timeout: 60_000});

      await memberPageManagerA.webapp.modals.dataShareConsent().clickDecline();
      await memberPageManagerB.webapp.modals.dataShareConsent().clickDecline();

      await createGroup(memberPageManagerA, conversationName, [memberB]);

      await memberAPages.conversationList().openConversation(conversationName);
      await memberPagesB.conversationList().openConversation(conversationName);

      await test.step('User A starts typing in group and B sees typing indicator', async () => {
        // user b starts typing
        await memberPagesB.conversation().messageInput.fill('t');
        await memberPageManagerB.waitForTimeout(200);
        await memberPagesB.conversation().messageInput.fill('ttttt');
        await memberPageManagerB.waitForTimeout(200);
        await memberPagesB.conversation().messageInput.fill('ttttt ttttt');

        const isVisible = await memberAPages.conversation().isTypingIndicator.isVisible();
        expect(isVisible).toBeTruthy();
      });

      await test.step('User A starts typing in group and B sees typing indicator', async () => {
        // todo
      });
      // user a turn off typing indicator?
      // user a starts typing -> user b don't see typing
    },
  );

  test(
    'I want to see collapsed view when app is narrow',
    {tag: ['@TC-48', '@regression']},
    async ({pageManager}) => {},
  );
  test(
    'I should not lose a drafted message when switching between conversations in collapsed view',
    {tag: ['@TC-51', '@regression']},
    async ({pageManager}) => {},
  );

  test.afterAll(async ({api}) => {
    await tearDownAll(api);
  });
});
