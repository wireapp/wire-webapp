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

import {Locator, Page} from '@playwright/test';

import {getUser, User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {connectWithUser, loginUser, logOutUser} from 'test/e2e_tests/utils/userActions';

import {test, expect, LOGIN_TIMEOUT, withLogin} from '../../test.fixtures';

const SCIM_LOGIN_TIMEOUT = 120_000;
const newDeviceModalTestId = 'modal-account-new-devices';
const scimLoginPollIntervalMilliseconds = 1_000;
const scimLoginMaximumAttempts = Math.ceil(SCIM_LOGIN_TIMEOUT / scimLoginPollIntervalMilliseconds);

function isLocatorVisible(locator: Locator): Promise<boolean> {
  return locator.isVisible().catch(() => {
    return false;
  });
}

async function waitForVisible(locator: Locator, timeout: number): Promise<boolean> {
  return locator.waitFor({state: 'visible', timeout}).then(
    () => {
      return true;
    },
    () => {
      return false;
    },
  );
}

async function dismissNewDeviceModalIfVisible(page: Page): Promise<boolean> {
  const newDeviceModal = page.getByTestId(newDeviceModalTestId);

  if (!(await waitForVisible(newDeviceModal, 500))) {
    return false;
  }

  await newDeviceModal.getByRole('button', {name: /^Ok$/i}).click();
  await expect(newDeviceModal).toBeHidden({timeout: 5_000});

  return true;
}

async function completeScimPostLoginFlow(page: Page, pageManager: PageManager): Promise<void> {
  const {pages, components} = pageManager.webapp;
  const removeDeviceButton = page.getByRole('button', {name: 'Remove device'}).first();
  const historyConfirmButton = pages.historyInfo().continueButton;
  const sidebar = components.conversationSidebar().sidebar;

  for (let attempt = 0; attempt < scimLoginMaximumAttempts; attempt += 1) {
    await dismissNewDeviceModalIfVisible(page);

    if (await isLocatorVisible(sidebar)) {
      return;
    }

    if (await waitForVisible(removeDeviceButton, 500)) {
      await removeDeviceButton.click();
      continue;
    }

    if (await waitForVisible(historyConfirmButton, 500)) {
      await historyConfirmButton.click();
      continue;
    }

    await page.waitForTimeout(scimLoginPollIntervalMilliseconds);
  }

  throw new Error(`SCIM login did not reach the sidebar within ${SCIM_LOGIN_TIMEOUT}ms`);
}

async function openAccountSettingsForScim(page: Page, pageManager: PageManager): Promise<void> {
  const {pages, components} = pageManager.webapp;
  const accountHeading = page.getByRole('heading', {name: 'Account', level: 2});

  await expect(async () => {
    await dismissNewDeviceModalIfVisible(page);

    if (!(await isLocatorVisible(pages.settings().accountButton))) {
      await components.conversationSidebar().preferencesButton.click({timeout: 5_000});
    }

    await dismissNewDeviceModalIfVisible(page);

    if (await isLocatorVisible(accountHeading)) {
      return;
    }

    await pages.settings().accountButton.click({timeout: 5_000});
    await dismissNewDeviceModalIfVisible(page);
    await expect(accountHeading).toBeVisible({timeout: 5_000});
  }).toPass({
    timeout: 60_000,
    intervals: [500, 1_000, 2_000],
  });
}

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
      test.setTimeout(180_000);

      const page = await createPage(context);
      const pageManager = PageManager.from(page);
      await pageManager.openMainPage();

      const {pages} = pageManager.webapp;
      const [idpPage] = await Promise.all([
        context.waitForEvent('page'),
        pages.singleSignOn().enterEmailOnSSOPage(ssoUser.email),
      ]);

      await test.step('Log in on IDP page', async () => {
        await idpPage.getByRole('textbox', {name: 'Username'}).fill(ssoUser.username, {timeout: 20_000});
        await idpPage.getByRole('textbox', {name: 'Password'}).fill(ssoUser.password);
        await idpPage.getByRole('button', {name: 'Sign In'}).click();
      });

      await test.step('Complete post-login flow', async () => {
        await completeScimPostLoginFlow(page, pageManager);
      });

      await openAccountSettingsForScim(page, pageManager);
      await dismissNewDeviceModalIfVisible(page);
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
      createPage(withLogin(memberA)),
      createPage(withLogin(memberB)),
    ]);
    await connectWithUser(memberAPage, memberB);

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

  test('Verify new username is synced across the devices', {tag: ['@TC-1938', '@regression']}, async ({createPage}) => {
    const {components, pages} = PageManager.from(await createPage(withLogin(memberA))).webapp;
    await components.conversationSidebar().clickPreferencesButton();
    // Verify initial username
    await expect(pages.account().usernameDisplay).toContainText(memberA.username);

    // Change username to a unique name
    const newUserName = `user_${Date.now()}`;
    await pages.account().changeUserName(newUserName);
    await expect(pages.account().usernameDisplay).toContainText(newUserName);

    // Setup second device session
    const {components: userA2DeviceComponents} = PageManager.from(
      await createPage(withLogin(memberA, {confirmNewHistory: true})),
    ).webapp;

    // Verify sync on second device
    await expect(userA2DeviceComponents.conversationSidebar().personalUserName).toContainText(newUserName);
  });

  test(
    'Verify autogeneration of a username for a user',
    {tag: ['@TC-1939', '@regression']},
    async ({createPage, api}) => {
      const usernameScenarios = [
        {firstName: 'Jack', expectedUsername: 'jack'},
        {firstName: 'Jack.Wireson', expectedUsername: 'jackwireson'},
        {firstName: 'Æéÿüíøšłźçñ', expectedUsername: 'aeeyueioslzcn'},
        {firstName: 'Даша', expectedUsername: 'dasha'},
        {firstName: 'داريا', expectedUsername: 'darya'},
        {firstName: 'Jack😼', expectedUsername: 'jack'},
      ];

      await Promise.all(
        usernameScenarios.map(async ({firstName, expectedUsername}) => {
          return test.step(`Scenario: ${firstName} -> ${expectedUsername}`, async () => {
            const userA = getUser({firstName});
            const userPage = await createPage();
            const userPageManager = PageManager.from(userPage);
            const {pages, components, modals} = userPageManager.webapp;

            await test.step('Register user and handle verification', async () => {
              await userPageManager.openMainPage();
              await pages.singleSignOn().enterEmailOnSSOPage(userA.email);
              await pages.welcome().clickCreateAccountButton();
              await pages.welcome().clickCreatePersonalAccountButton();

              await pages.registration().fillInUserInfo(userA);
              await pages.registration().toggleTermsCheckbox();
              await pages.registration().clickSubmitButton();

              await expect(pages.emailVerification().verificationCodeInputLabel).toBeVisible();

              const verificationCode = await api.brig.getActivationCodeForEmail(userA.email);
              await pages.emailVerification().enterVerificationCode(verificationCode);
              await modals.marketingConsent().clickConfirmButton();
            });

            try {
              await test.step('Verify autogenerated username on registration and profile', async () => {
                await expect(pages.setUsername().handleInput).toHaveValue(new RegExp(expectedUsername));

                await pages.setUsername().clickNextButton();
                await pages.registerSuccess().clickOpenWireWebButton();
                await modals.confirm().cancelButton.click({timeout: LOGIN_TIMEOUT});

                await components.conversationSidebar().clickPreferencesButton();
                await expect(pages.account().usernameDisplay).toContainText(expectedUsername);
              });
            } finally {
              await test.step('Cleanup: delete account and close page', async () => {
                await pages.account().clickDeleteAccountButton();
                await expect(modals.confirm().modal).toBeVisible();
                await modals.confirm().actionButton.click();

                const deletionUrl = await api.inbucket.getAccountDeletionURL(userA.email);

                await userPageManager.openNewTab(deletionUrl, async tab => {
                  await tab.webapp.pages.deleteAccount().deleteAccountButton.click();
                  await expect(tab.webapp.pages.deleteAccount().accountDeletedHeadline).toContainText(
                    'Account deleted',
                  );
                });

                await userPage.close();
              });
            }
          });
        }),
      );
    },
  );

  test('Verify username is unique', {tag: ['@TC-1942', '@regression']}, async ({createPage, createUser, api}) => {
    const userA = await createUser();

    const userB = getUser();
    const userPage = await createPage();
    const userPageManager = PageManager.from(userPage);
    const {pages, components, modals} = userPageManager.webapp;

    await test.step('Register User B before username selection', async () => {
      await userPageManager.openMainPage();
      await pages.singleSignOn().enterEmailOnSSOPage(userB.email);
      await pages.welcome().clickCreateAccountButton();
      await pages.welcome().clickCreatePersonalAccountButton();

      await pages.registration().fillInUserInfo(userB);
      await pages.registration().toggleTermsCheckbox();
      await pages.registration().clickSubmitButton();
      await expect(pages.emailVerification().verificationCodeInputLabel).toBeVisible();

      const verificationCode = await api.brig.getActivationCodeForEmail(userB.email);
      await pages.emailVerification().enterVerificationCode(verificationCode);
      await modals.marketingConsent().clickConfirmButton();
    });

    await test.step('Validate username uniqueness error during account creating', async () => {
      await pages.setUsername().setUsername(userA.username);
      await pages.setUsername().clickNextButton();
      await expect(pages.setUsername().errorMessage).toContainText('This username is already taken');

      // Proceed successfully with User B's unique username
      await pages.setUsername().setUsername(userB.username);
      await pages.setUsername().clickNextButton();
      await pages.registerSuccess().clickOpenWireWebButton();
      await modals.confirm().cancelButton.click({timeout: LOGIN_TIMEOUT});
    });

    await test.step('Validate username uniqueness error inside Profile Settings', async () => {
      await components.conversationSidebar().clickPreferencesButton();
      await expect(pages.account().usernameDisplay).toContainText(userB.username);
      await pages.account().changeUserName(userA.username);

      // TODO(WPB-25926): Currently the error message isn't shown correctly in the UI
      // await expect(userPage.getByText('Already taken')).toBeVisible();
      // await pages.account().userNameInput.fill(userB.username);
      // await pages.account().userNameInput.press('Enter');

      await expect(pages.account().usernameDisplay).toContainText(userB.username);
    });

    await test.step('Delete user', async () => {
      await components.conversationSidebar().clickPreferencesButton();
      await pages.account().clickDeleteAccountButton();
      await expect(modals.confirm().modalTitle).toContainText('Delete account');
      await modals.confirm().actionButton.click();
      const url = await api.inbucket.getAccountDeletionURL(userB.email);

      await userPageManager.openNewTab(url, async tab => {
        await tab.webapp.pages.deleteAccount().deleteAccountButton.click();
        await expect(tab.webapp.pages.deleteAccount().accountDeletedHeadline).toContainText('Account deleted');
      });
    });
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
        await components.conversationSidebar().allConversationsButton.click();

        await pages.conversationList().clickCreateGroup();
        await modals.createConversation().createChannel('Test Channel', {members: [memberB]});

        await pages.conversationList().getConversation('Test Channel').open();
        await pages.conversation().conversationInfoButton.click();
        await expect(pages.conversationDetails().groupAdmins.filter({hasText: memberA.fullName})).toBeVisible();
      });
    },
  );
});
