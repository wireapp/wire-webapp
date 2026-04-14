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
import enTranslations from 'I18n/en-US.json';

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

    const welcomeTextDE = deTranslations['index.welcome'].replace('{brandName}', 'Wire');
    await expect(dePages.singleSignOn().header).toHaveText(welcomeTextDE);
    await expect(dePages.singleSignOn().ssoCodeEmailInput).toHaveAttribute(
      'placeholder',
      deTranslations['ssoLogin.codeOrMailInputPlaceholder'],
    );
    await expect(dePages.singleSignOn().ssoSignInButton).toHaveText(deTranslations['authAccountSignIn']);

    // Localization checks for ENGLISH browser
    const enContext = await browser.newContext({locale: 'en-US'});

    const enPageManager = PageManager.from(await createPage(enContext));
    const {pages: enPages} = enPageManager.webapp;

    await enPageManager.openSSOPage();

    const welcomeTextEN = enTranslations['index.welcome'].replace('{brandName}', 'Wire');
    await expect(enPages.singleSignOn().header).toHaveText(welcomeTextEN);
    await expect(enPages.singleSignOn().ssoCodeEmailInput).toHaveAttribute(
      'placeholder',
      enTranslations['ssoLogin.codeOrMailInputPlaceholder'],
    );
    await expect(enPages.singleSignOn().ssoSignInButton).toHaveText(enTranslations['authAccountSignIn']);
  });

  test('Verify support pages are opened in language de', {tag: ['@TC-3456', '@regression']}, async ({createPage}) => {
    const mainPage = await createPage(withLogin(userA));

    const {components} = PageManager.from(mainPage).webapp;

    const [newPage] = await Promise.all([
      mainPage.waitForEvent('popup'),
      components.conversationSidebar().supportButton.click(),
    ]);

    await expect(newPage).toHaveURL(/\/de/);
  });

  test(
    'Verify registration screen has German-localized strings',
    {tag: ['@TC-1273', '@regression']},
    async ({createPage}) => {
      const pageManager = PageManager.from(await createPage());

      const {pages} = pageManager.webapp;
      await pageManager.openRegistrationPage();

      await expect(pages.registration().nameInput).toHaveAttribute(
        'placeholder',
        deTranslations['accountForm.namePlaceholder'],
      );
      await expect(pages.registration().emailInput).toHaveAttribute(
        'placeholder',
        deTranslations['accountForm.emailPersonalPlaceholder'],
      );
      await expect(pages.registration().passwordInput).toHaveAttribute(
        'placeholder',
        deTranslations['accountForm.passwordPlaceholder'],
      );

      const termsText = deTranslations['accountForm.termsAndConditions'].replace(
        '{termsAndConditionsLink}',
        deTranslations['accountForm.termsAndConditionsLink'],
      );
      await expect(pages.registration().termsLabel).toContainText(termsText);
      await expect(pages.registration().header).toHaveText(deTranslations['createPersonalAccount.headLine']);
    },
  );

  test('Verify login screen has German-localized strings', {tag: ['@TC-1274', '@regression']}, async ({createPage}) => {
    const pageManager = PageManager.from(await createPage());

    const {pages} = pageManager.webapp;
    await pageManager.openLoginPage();

    const welcomeText = deTranslations['index.welcome'].replace('{brandName}', 'Wire');
    await expect(pages.login().header).toHaveText(welcomeText);
    await expect(pages.login().emailInput).toHaveAttribute('placeholder', deTranslations['login.emailPlaceholder']);
    await expect(pages.login().signInButton).toHaveText(deTranslations['authAccountSignIn']);
  });

  test(
    'Verify conversation view and list has German-localized strings',
    {tag: ['@TC-1275', '@regression']},
    async ({createPage}) => {
      const page = await createPage(withLogin(userA));
      const {pages, modals, components} = PageManager.from(page).webapp;

      // Connect users manually due to the current locators don't work in german browser
      await components.conversationSidebar().connectButton.click();
      await pages
        .startUI()
        .component.getByPlaceholder(deTranslations['searchPeopleOnlyPlaceholder'])
        .fill(userB.fullName);
      await pages.startUI().component.getByRole('button', {name: userB.fullName}).click();
      await modals.userProfile().startConversationButton.click();

      const conversation = await pages.conversationList().getConversationLocator(userB.fullName).open();
      const messagePlaceholder = page.locator('[data-uie-name="input-placeholder"]');
      await expect(messagePlaceholder).toHaveText(deTranslations['tooltipConversationInputPlaceholder']);

      await components.conversationSidebar().allConverationsButton.click();
      await conversation.getByRole('button', {name: deTranslations['accessibility.conversationOptionsMenu']}).click();

      const menuList = page.getByRole('menu').getByRole('menuitem');

      await expect
        .poll(async () => await menuList.allInnerTexts())
        .toEqual(
          expect.arrayContaining([
            deTranslations['conversationsPopoverNotificationSettings'], // notifications button
            deTranslations['conversationPopoverFavorite'], // favorite button
            deTranslations['conversationsPopoverMoveTo'], // move to button
            deTranslations['conversationsPopoverArchive'], // archive button
            deTranslations['conversationsPopoverClear'], // clear content button
          ]),
        );
    },
  );

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
