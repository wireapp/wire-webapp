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
import {test, withLogin, expect} from 'test/e2e_tests/test.fixtures';
import {loginUser} from '../../utils/userActions';
import deTranslations from 'I18n/de-DE.json';

test.describe('Localization', () => {
  test.use({locale: 'de-DE'});

  let userA: User;
  let userB: User;

  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser({locale: 'de-DE'});
    const team = await createTeam('Test Team', {users: [userB]});
    userA = team.owner;
  });


  test('Verify welcome page is localized', {tag: ['@TC-3455', '@regression']}, async ({createPage, browser}) => {
    // Localization checks for GERMAN browser
    const dePageManager = PageManager.from(await createPage());
    const {pages: dePages} = dePageManager.webapp;

    await dePageManager.openSSOPage();

    await expect(dePages.singleSignOn().header).toHaveText('Willkommen bei Wire!');
    await expect(dePages.singleSignOn().ssoCodeEmailInput).toHaveAttribute('placeholder', 'E-Mail-Adresse oder SSO-Code');
    await expect(dePages.singleSignOn().ssoSignInButton).toHaveText('Anmelden');

    // Localization checks for ENGLISH browser
    const enContext = await browser.newContext({locale: 'en-US'});

    const enPageManager = PageManager.from(await createPage(enContext));
    const {pages: enPages} = enPageManager.webapp;

    await enPageManager.openSSOPage();

    await expect(enPages.singleSignOn().header).toHaveText('Welcome to Wire!');
    await expect(enPages.singleSignOn().ssoCodeEmailInput).toHaveAttribute('placeholder', 'Email or SSO code');
    await expect(enPages.singleSignOn().ssoSignInButton).toHaveText('Log in');
  });

  test('Verify support pages are opened in language de', {tag: ['@TC-3456', '@regression']}, async ({createPage}) => {
    const mainPage = await createPage(withLogin(userA));

    const {components} = PageManager.from(mainPage).webapp;

    const [newPage] = await Promise.all([
      mainPage.waitForEvent('popup'),
      components.conversationSidebar().supportButton.click(),
    ]);

    await newPage.waitForLoadState();
    await expect(newPage).toHaveURL(/\/de/);
  });

  test(
    'Verify registration screen has German-localized strings',
    {tag: ['@TC-1273', '@regression']},
    async ({createPage}) => {
      const pageManager = PageManager.from(await createPage());

      const {pages} = pageManager.webapp;
      await pageManager.openRegistrationPage();

      await expect(pages.registration().nameInput).toHaveAttribute('placeholder', 'Name eingeben');
      await expect(pages.registration().emailInput).toHaveAttribute('placeholder', 'E-Mail-Adresse eingeben');
      await expect(pages.registration().passwordInput).toHaveAttribute('placeholder', 'Passwort eingeben');
      await expect(pages.registration().termsLabel).toContainText('Ich akzeptiere Wires');
      await expect(pages.registration().header).toHaveText('Ein privates Benutzerkonto erstellen');
    },
  );

  test('Verify login screen has German-localized strings', {tag: ['@TC-1274', '@regression']}, async ({createPage}) => {
    const pageManager = PageManager.from(await createPage());

    const {pages} = pageManager.webapp;
    await pageManager.openLoginPage();

    await expect(pages.login().header).toHaveText('Willkommen bei Wire!');
    await expect(pages.login().emailInput).toHaveAttribute('placeholder', 'E-Mail-Adresse oder Benutzername');
    await expect(pages.login().signInButton).toHaveText('Anmelden');
  });

  test(
    'Verify conversation view and list has German-localized strings',
    {tag: ['@TC-1275', '@regression']},
    async ({createPage}) => {
      const page = await createPage(withLogin(userA));
      const {pages, modals, components} = PageManager.from(page).webapp;

      // Connect users manually due to the current locators don't work in german browser
      await components.conversationSidebar().connectButton.click();
      await pages.startUI().component.getByPlaceholder(deTranslations['searchPeopleOnlyPlaceholder']).fill(userB.fullName);
      await pages.startUI().component.getByRole('button', {name: userB.fullName}).click();
      await modals.userProfile().startConversationButton.click();

      await pages.conversationList().openConversation(userB.fullName);
      const messagePlaceholder = page.locator('[data-uie-name="input-placeholder"]');
      await expect(messagePlaceholder).toHaveText(deTranslations['tooltipConversationInputPlaceholder']);

      await components.conversationSidebar().allConverationsButton.click();
      await pages.conversationList().clickConversationOptions(userB.fullName);

      const menuList = page.getByTestId('conversation-list-options-menu');

      await expect
        .poll(async () => await menuList.allInnerTexts())
        .toEqual(
          expect.arrayContaining([
            deTranslations['conversationDetailsActionNotifications'], // notifications button
            deTranslations['conversationPopoverFavorite'], // favorite button
            deTranslations['conversationsPopoverMoveTo'], // move to button
            deTranslations['conversationDetailsActionArchive'], // archive button
            deTranslations['conversationDetailsActionClear'], // clear content button
          ]),
        );
    });

  test('Verify registration email is de', {tag: ['@TC-1277', '@regression']}, async ({createPage, api}) => {
    const pageManager = PageManager.from(await createPage());

    await pageManager.openRegistrationPage();
    const {pages} = pageManager.webapp;

    const user = getUser();

    await pages.registration().fillInUserInfo(user);

    await pages.registration().termsCheckbox.dispatchEvent('click');
    await pages.registration().submitButton.click();

    await expect
      .poll(
        async () => {
          const email = await api.inbucket.getLatestEmail(user.email);
          return email.data?.body?.text;
        },
        {intervals: [1_000]},
      )
      .toContain('um Ihre E-Mail-Adresse zu bestätigen und Ihr Benutzerkonto');
  });

  test('Verify new device email is de', {tag: ['@TC-1278', '@regression']}, async ({createPage, api}) => {
    const pageManager = PageManager.from(await createPage(withLogin(userB)));
    const {pages, modals, components} = pageManager.webapp;

    await components.conversationSidebar().clickPreferencesButton();
    await pages.account().clickLogoutButton();
    await modals.confirmLogout().modal.getByText(deTranslations['modalAccountLogoutOption']).click();
    await modals.confirmLogout().clickConfirm();

    await loginUser(userB, pageManager);

    await pages.historyInfo().clickConfirmButton();

    await expect
      .poll(
        async () => {
          const email = await api.inbucket.getLatestEmail(userB.email);
          return email.data?.body?.text;
        },
        {intervals: [1_000]},
      )
      .toContain('Ein neues Gerät wurde zu Ihrem Wire-Benutzerkonto hinzugefügt');
  });
});
