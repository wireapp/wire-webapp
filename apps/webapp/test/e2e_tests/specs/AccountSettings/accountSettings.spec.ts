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
import {loginUser, logOutUser} from 'test/e2e_tests/utils/userActions';

import {test, expect, LOGIN_TIMEOUT, withLogin, withConnectedUser} from '../../test.fixtures';

test.describe('account settings', () => {
  let owner: User;
  let memberA: User;
  let memberB: User;

  test.beforeEach(async ({createUser, createTeam}, testInfo) => {
    [memberA, memberB] = await Promise.all([createUser(), createUser()]);
    ({owner} = await createTeam('Test Team', {
      users: [memberA, memberB],
      features: {channels: testInfo.tags.includes('@TC-1948')},
    }));
  });

  test('Edit Profile', {tag: ['@TC-8770', '@regression']}, async ({createPage}) => {
    const {pages, components} = PageManager.from(await createPage(withLogin(memberA))).webapp;

    await components.conversationSidebar().clickPreferencesButton();

    await expect(pages.account().emailDisplay).toHaveText(memberA.email);
    await expect(pages.account().nameDisplay).toHaveText(memberA.fullName);
    await expect(pages.account().domainDisplay).toHaveText('staging.zinfra.io');
    await expect(pages.account().usernameDisplay).toHaveText(`@${memberA.username}@staging.zinfra.io`);
  });

  test(
    'I should not be able to change my email to already taken email',
    {tag: ['@TC-58', '@regression']},
    async ({createPage}) => {
      const {components, modals, pages} = PageManager.from(await createPage(withLogin(memberA))).webapp;
      await components.conversationSidebar().clickPreferencesButton();

      await expect(pages.account().emailDisplay).toHaveText(memberA.email);

      await pages.account().changeEmailAddress(memberB.email);
      await expect(modals.acknowledge().modal).toBeVisible();
      await expect(modals.acknowledge().modalTitle).toContainText('Error');
    },
  );

  test(
    'I should not be able to change my email to an invalid email address',
    {tag: ['@TC-59', '@regression']},
    async ({createPage}) => {
      const incorrectEmail = 'nopewearezeta.com';
      const {components, modals, pages} = PageManager.from(await createPage(withLogin(memberA))).webapp;

      await components.conversationSidebar().clickPreferencesButton();
      await expect(pages.account().emailDisplay).toHaveText(memberA.email);

      await pages.account().changeEmailAddress(incorrectEmail);
      await expect(modals.acknowledge().modal).toBeVisible();
      await expect(modals.acknowledge().modalTitle).toContainText('Error');
      await expect(modals.acknowledge().modalText).toContainText('Email address is invalid');
    },
  );

  const ssoUser = getUser({
    email: process.env.SCIM_USER_SSO_CODE,
    username: process.env.SCIM_USER_EMAIL,
    password: process.env.SCIM_USER_PASSWORD,
  });

  test(
    'I should not be able to change email of user managed by SCIM',
    {tag: ['@TC-60', '@regression']},
    async ({context, createPage}) => {
      const page = await createPage(context);
      const pageManager = PageManager.from(page);
      await pageManager.openMainPage();

      const {pages, components} = pageManager.webapp;
      const [idpPage] = await Promise.all([
        context.waitForEvent('page'),
        pages.singleSignOn().enterEmailOnSSOPage(ssoUser.email),
      ]);

      await test.step('Log in on IDP page', async () => {
        await idpPage.getByRole('textbox', {name: 'Username'}).fill(ssoUser.username, {timeout: 20_000});
        await idpPage.getByRole('textbox', {name: 'Password'}).fill(ssoUser.password);
        await idpPage.getByRole('button', {name: 'Sign In'}).click();
      });

      await test.step('Remove an existing device and confirm new history', async () => {
        // Since this test re-uses the same user over and over again we need to always remove one of the previously registered devices
        await page.getByRole('button', {name: 'Remove device'}).first().click({timeout: LOGIN_TIMEOUT});
        // We will also always be prompted to confirm the new history on this device
        await pages.historyInfo().clickConfirmButton();
        await expect(components.conversationSidebar().sidebar, `Login took more than ${LOGIN_TIMEOUT}s`).toBeVisible({
          timeout: LOGIN_TIMEOUT,
        });
      });

      await pages.sidebar().clickPreferencesButton();
      await pages.settings().accountButton.click();
      await expect(pages.account().emailDisplay).not.toBeVisible();
    },
  );

  test('Verify sound settings are saved after re-login', {tag: ['@TC-1718', '@regression']}, async ({createPage}) => {
    const pageManager = PageManager.from(await createPage(withLogin(memberA)));
    const {pages, components} = pageManager.webapp;

    await components.conversationSidebar().preferencesButton.click();
    await pages.settings().optionsButton.click();

    await pages.options().setSoundAlerts('None');
    await logOutUser(pageManager);

    await loginUser(memberA, pageManager);
    await components.conversationSidebar().preferencesButton.click({timeout: LOGIN_TIMEOUT});
    await pages.settings().optionsButton.click();

    await expect(pages.options().soundAlertsRadioGroup.getByRole('radio', {name: 'None'})).toBeChecked();

    await pages.options().setSoundAlerts('All');
    await logOutUser(pageManager);
    await loginUser(memberA, pageManager);

    await components.conversationSidebar().preferencesButton.click({timeout: LOGIN_TIMEOUT});
    await pages.settings().optionsButton.click();
    await expect(pages.options().soundAlertsRadioGroup.getByRole('radio', {name: 'All'})).toBeChecked();
  });

  test('Verify I can set sound alert settings', {tag: ['@TC-1720', '@regression']}, async ({createPage}) => {
    const pageManager = PageManager.from(await createPage(withLogin(memberA)));
    const {pages, components} = pageManager.webapp;

    await components.conversationSidebar().preferencesButton.click();
    await pages.settings().optionsButton.click();
    await pages.options().setSoundAlerts('None');

    await expect(pages.options().soundAlertsRadioGroup.getByRole('radio', {name: 'None'})).toBeChecked();
  });

  test(
    'Verify links to manage and create teams are shown when logged in as team owner',
    {tag: ['@TC-1723', '@regression']},
    async ({createPage}) => {
      const {components} = PageManager.from(await createPage(withLogin(owner))).webapp;

      await expect(components.conversationSidebar().manageTeamButton).toBeVisible();
      expect(await components.conversationSidebar().manageTeamButton.getAttribute('href')).toMatch(
        /^https:\/\/wire-teams-.+\.zinfra\.io\/login\/$/,
      );
    },
  );

  test(
    'Verify link to manage a team is not shown when logged in as team member or normal use',
    {tag: ['@TC-1724', '@regression']},
    async ({createPage}) => {
      const {components} = PageManager.from(await createPage(withLogin(memberA))).webapp;
      await expect(components.conversationSidebar().manageTeamButton).not.toBeAttached();
    },
  );

  test('Verify I can retrieve calling logs', {tag: ['@TC-1725', '@regression']}, async ({createPage}) => {
    const [memberAPage, memberBPage] = await Promise.all([
      createPage(withLogin(memberA), withConnectedUser(memberB)),
      createPage(withLogin(memberB)),
    ]);
    const memberAPages = PageManager.from(memberAPage).webapp.pages;
    const memberBPages = PageManager.from(memberBPage).webapp.pages;

    await memberAPages.conversationList().getConversation(memberB.fullName, {protocol: 'mls'}).open();

    await memberAPages.conversation().startCall();
    await memberBPages.calling().clickAcceptCallButton();

    const expectedLog = '@wireapp/webapp/avs'; // get one phone call
    await expect
      .poll(async () => (await memberAPage.consoleMessages()).map(m => m.text()))
      .toEqual(expect.arrayContaining([expect.stringContaining(expectedLog)]));
  });

  test(
    'I want to see the Full Name wherever my name gets displayed',
    {tag: ['@TC-1948', '@regression']},
    async ({createPage}) => {
      const page = await createPage(withLogin(memberA));
      const {pages, modals, components} = PageManager.from(page).webapp;

      await pages.conversationList().clickCreateGroup();
      await modals.createConversation().createGroup('Test Group', {members: [memberB]});

      await test.step('Conversation sidebar', async () => {
        await expect(components.conversationSidebar().personalStatusLabel).toHaveText(memberA.fullName);
      });

      await test.step('Conversation itself on top of users message', async () => {
        await pages.conversationList().getConversation('Test Group').open();
        await pages.conversation().sendMessage('test');
        await expect(pages.conversation().getMessage({content: 'test'})).toContainText(memberA.fullName);
      });

      await test.step('The list of likes under the liked message', async () => {
        const message = pages.conversation().getMessage({content: 'test'});
        await pages.conversation().reactOnMessage(message, 'plus-one');

        await pages.conversation().getReactionOnMessage(message, 'plus-one').hover();
        await expect(page.getByRole('tooltip', {name: /reacted with \+1$/})).toContainText(`${memberA.fullName}`);
      });

      await test.step('Group conversation details', async () => {
        await pages.conversation().conversationInfoButton.click();
        await expect(pages.conversationDetails().groupAdmins.filter({hasText: memberA.fullName})).toBeVisible();
      });

      await test.step('Settings - Account', async () => {
        await components.conversationSidebar().preferencesButton.click();
        await pages.settings().accountButton.click();
        await expect(pages.account().nameDisplay).toHaveText(memberA.fullName);
      });

      await test.step('Channel details', async () => {
        await components.conversationSidebar().allConverationsButton.click();

        await pages.conversationList().clickCreateGroup();
        await modals.createConversation().createChannel('Test Channel', {members: [memberB]});

        await pages.conversationList().getConversation('Test Channel').open();
        await pages.conversation().conversationInfoButton.click();
        await expect(pages.conversationDetails().groupAdmins.filter({hasText: memberA.fullName})).toBeVisible();
      });
    },
  );
});
