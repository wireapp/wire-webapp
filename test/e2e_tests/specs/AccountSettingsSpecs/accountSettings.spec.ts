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

import {getUser, User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {setupBasicTestScenario} from 'test/e2e_tests/utils/setup.utli';
import {tearDownAll} from 'test/e2e_tests/utils/tearDown.util';
import {createChannel, createGroup, loginUser} from 'test/e2e_tests/utils/userActions';

import {test, expect} from '../../test.fixtures';

test.describe('account settings', () => {
  let owner = getUser();
  const members = Array.from({length: 2}, () => getUser());
  const [memberA, memberB] = members;
  test.slow();

  const startUpApp = async (pageManager: PageManager, user: User) => {
    const {components, modals} = pageManager.webapp;
    await pageManager.openMainPage();
    await loginUser(user, pageManager);
    await components.conversationSidebar().isPageLoaded();
    await modals.dataShareConsent().clickDecline();
  };

  test.beforeAll(async ({api}) => {
    const user = await setupBasicTestScenario(api, members, owner, 'test');
    owner = {...owner, ...user};
  });

  test('Edit Profile', {tag: ['@TC-8770', '@regression']}, async ({pageManager}) => {
    const {components, pages} = pageManager.webapp;

    await startUpApp(pageManager, memberA);
    await components.conversationSidebar().clickPreferencesButton();

    await expect(pages.account().emailDisplay).toHaveText(memberA.email);
    await expect(pages.account().displayNameDisplay).toHaveText(memberA.fullName);
    await expect(pages.account().domainDisplay).toHaveText('staging.zinfra.io');
    await expect(pages.account().usernameDisplay).toHaveText(`@${memberA.username}@staging.zinfra.io`);
  });

  test(
    'I should not be able to change my email to already taken email',
    {tag: ['@TC-58', '@regression']},
    async ({pageManager, api}) => {
      const {components, modals, pages} = pageManager.webapp;

      await startUpApp(pageManager, memberA);
      await components.conversationSidebar().clickPreferencesButton();

      await expect(pages.account().emailDisplay).toHaveText(memberA.email);

      await pages.account().changeEmailAddress(memberA.email);
      await modals.baseModal().modalTitle.waitFor({state: 'visible'});

      expect(await modals.baseModal().getModalTitle()).toContain('Error');
    },
  );

  test(
    'I should not be able to change my email to an invalid email address',
    {tag: ['@TC-59', '@regression']},
    async ({pageManager}) => {
      const incorrectEmail = 'nopewearezeta.com';
      const {components, modals, pages} = pageManager.webapp;

      await startUpApp(pageManager, memberA);
      await components.conversationSidebar().clickPreferencesButton();

      await expect(pages.account().emailDisplay).toHaveText(memberA.email);

      await pages.account().changeEmailAddress(incorrectEmail);
      await modals.baseModal().modalTitle.waitFor({state: 'visible'});

      expect(await modals.baseModal().getModalTitle()).toContain('Error');
      expect(await modals.baseModal().getModalText()).toContain('Email address is invalid.');
    },
  );

  test(
    'I should not be able to change email of user managed by SCIM',
    {tag: ['@TC-60', '@regression']},
    async ({pageManager, api}) => {
      ///TODO: read in docs
      // add to the bridge the url to enable scim?
      // add a new user
      // login with the user
      // try to change the email
    },
  );

  test.skip(
    'Verify sound settings are saved after re-login',
    {tag: ['@TC-1718', '@TC-1720', '@regression']},
    async ({pageManager}) => {
      const {components, modals, pages} = pageManager.webapp;

      await startUpApp(pageManager, memberA);
      await components.conversationSidebar().clickPreferencesButton();

      await pages.settings().clickOptionsButton();

      await pages.options().checkSoundNone(); // cannot reach the input element its behind the label element
      await pages.settings().clickAccountButton();
      await pages.account().clickLogoutButton();
      await modals.confirmLogout().clickConfirm();

      await loginUser(memberA, pageManager);
      await components.conversationSidebar().isPageLoaded();
      await pages.settings().clickOptionsButton();

      await expect(pages.options().checkboxSoundAlertsNone).toBeChecked();

      await pages.options().checkSoundAll(); // cannot reach the input element its behind the label element
      await pages.account().clickLogoutButton();
      await modals.confirmLogout().clickConfirm();
      await loginUser(memberA, pageManager);

      await components.conversationSidebar().isPageLoaded();
      await pages.settings().clickOptionsButton();

      await expect(pages.options().checkboxSoundAlertsAll).toBeChecked();
    },
  );

  test(
    'Verify links to manage and create teams are shown when logged in as team owner',
    {tag: ['@TC-1723', '@regression']},
    async ({pageManager}) => {
      const {components} = pageManager.webapp;

      await startUpApp(pageManager, owner);

      await expect(components.conversationSidebar().manageTeamButton).toBeVisible();
      await expect(await components.conversationSidebar().manageTeamButton.getAttribute('href')).toBe(
        'https://wire-teams-dev.zinfra.io/login/',
      );
    },
  );

  test(
    'Verify link to manage a team is not shown when logged in as team member or normal use',
    {tag: ['@TC-1723', '@regression']},
    async ({pageManager}) => {
      const {components} = pageManager.webapp;

      await startUpApp(pageManager, memberA);
      await expect(components.conversationSidebar().manageTeamButton).toHaveCount(0);
    },
  );

  test(
    'Verify I can retrieve calling logs',
    {tag: ['@TC-1725', '@regression']},
    async ({pageManager: memberPageManagerA, browser, api}) => {
      const consoleMessages: string[] = [];

      const memberContext = await browser.newContext();
      const memberPage = await memberContext.newPage();
      const memberPageManagerB = new PageManager(memberPage);
      const {pages, components, modals} = memberPageManagerA.webapp;

      const page = await memberPageManagerA.getPage();

      page.on('console', msg => {
        consoleMessages.push(msg.text());
      });

      await Promise.all([startUpApp(memberPageManagerA, memberA), startUpApp(memberPageManagerB, memberB)]);

      await components.conversationSidebar().clickConnectButton();
      await components.conversationList().clickOnContact(memberB.fullName);
      await modals.userProfile().clickStartConversation();
      await pages.conversation().startCall();
      await components.calling().waitForCell();
      await memberPageManagerB.webapp.components.calling().clickAcceptCallButton();
      // go to call
      await memberPageManagerA.waitForTimeout(1000);

      const expectedLog = '@wireapp/webapp/avs'; // get one phone call
      const foundLog = consoleMessages.some(msg => msg.includes(expectedLog));

      expect(foundLog).toBeTruthy();
    },
  );

  /*
    1. Conversation sidebar.
    2. Conversation itself on top of the user's message
    3. The list of "likes" under the liked message.
    4. Settings - Account
    5. Group conversation details
    6. Channel details
  */
  test(
    'I want to see the Full Name wherever my name gets displayed',
    {tag: ['@TC-1948', '@regression']},
    async ({pageManager, api}) => {
      const {components, pages} = pageManager.webapp;

      await startUpApp(pageManager, memberA);
      await expect(components.conversationSidebar().personalStatusLabel).toHaveText(memberA.fullName);
      await createGroup(pageManager, 'test group', [memberB]);
      await pages.conversation().sendMessage('test');

      const message = await pages.conversation().messageItems.nth(1); // skip the system messages
      await expect(message.getByTestId('sender-name')).toHaveText(memberA.fullName);

      await pages.conversation().reactOnMessage(message);

      await expect(await pages.conversation().getCurrentFocusedToolTip(message)).toHaveText(
        `${memberA.fullName} reacted with +1`,
      );

      await pages.conversation().clickConversationInfoButton();
      await expect(pages.conversationDetails().isUserPartOfConversationAsAdmin(memberA.fullName)).toBeTruthy();

      await api.brig.enableMLSFeature(owner.teamId);
      await api.brig.unlockChannelFeature(owner.teamId);
      await api.brig.enableChannelsFeature(owner.teamId);

      await (await pageManager.getPage()).reload();

      await createChannel(pageManager, 'test', [memberB]);

      await pages.conversation().clickConversationInfoButton();
      await expect(pages.conversationDetails().isUserPartOfConversationAsAdmin(memberA.fullName)).toBeTruthy();

      // go to settings
      await components.conversationSidebar().clickPreferencesButton();
      await expect(pages.account().displayNameDisplay).toHaveText(memberA.fullName);
    },
  );

  test.afterAll(async ({api}) => {
    await tearDownAll(api);
  });
});
