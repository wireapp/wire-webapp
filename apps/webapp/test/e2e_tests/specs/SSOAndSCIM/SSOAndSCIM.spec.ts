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
import {test, expect} from 'test/e2e_tests/test.fixtures';
import {Page} from '@playwright/test';
import {getImageFilePath} from 'test/e2e_tests/utils/sendImage.util';

import {FEATURE_KEY} from '@wireapp/api-client/lib/team/feature';
import {PageManager} from 'test/e2e_tests/pageManager';

test.describe('SSO and SCIM', () => {
  test.describe.configure({timeout: 180_000});
  let userA: User;
  let userB: User;
  let samlClientId: string;
  let identityProviderId: string;
  let keycloakUserId: string;

  test.beforeEach(async ({createTeam, api}) => {
    // Creating a team and enabling SSO feature.
    const team = await createTeam('Test Team', {features: {sso: true}});
    userA = team.owner;

    await api.waitForFeatureToBeEnabled(FEATURE_KEY.SSO, userA.teamId, userA.token);

    // Register a Keycloak user. This user will be used to log in via SSO and SCIM.
    userB = getUser();
    const metadata = await api.keycloak.getMetaData();
    identityProviderId = await api.identityProviders.createIdentityProviderV2(userA, metadata);
    samlClientId = await api.keycloak.createSamlClient(userA);
    keycloakUserId = await api.keycloak.createUser(userB);
  });

  test.afterEach(async ({api}) => {
    await api.keycloak.cleanUp(samlClientId, [keycloakUserId]);
  });

  test(
    'I want to register a new account with SSO',
    {tag: ['@TC-1735', '@regression']},
    async ({context, createPage}) => {
      const page = await createPage(context);
      const pageManager = PageManager.from(page);
      let idpPage: Page;

      const {pages, modals, components} = pageManager.webapp;
      await pageManager.openSSOPage();
      await pages.singleSignOn().isSSOPageVisible();

      await test.step('User enters SSO code into SSO field and clicks login', async () => {
        [idpPage] = await Promise.all([
          context.waitForEvent('page'),
          pages.singleSignOn().enterEmailOnSSOPage(`wire-${identityProviderId}`),
        ]);
      });

      await test.step('User enters Keycloak email and Keycloak password in the popup and clicks sign in.', async () => {
        await idpPage.getByRole('textbox', {name: 'Username'}).fill(userB.email, {timeout: 20_000});
        await idpPage.getByRole('textbox', {name: 'Password'}).fill(userB.password);
        await idpPage.getByRole('button', {name: 'Sign In'}).click();
      });

      await test.step('User clicks next on set username page in Wire', async () => {
        await modals.marketingConsent().clickConfirmButton();
        await pages.setUsername().clickNextButton();
        await modals.confirm().clickAction();
      });

      await test.step('User opens Account Settings', async () => {
        await components.conversationSidebar().clickPreferencesButton();
        await pages.settings().clickAccountButton();
      });

      await test.step("User doesn't see Reset Password button", async () => {
        await expect(pages.account().resetPasswordButton).not.toBeVisible();
      });
    },
  );

  test(
    'I should not be able to change name, unique username, email of user managed by SCIM',
    {tag: ['@TC-1756', '@regression']},
    async ({context, api, createPage}) => {
      const page = await createPage(context);
      const pageManager = PageManager.from(page);
      let idpPage: Page;

      const {pages, modals, components} = pageManager.webapp;
      await pageManager.openSSOPage();
      await pages.singleSignOn().isSSOPageVisible();

      await test.step('Precondition: User B is created as SCIM user', async () => {
        const scimToken = await api.scim.createSCIMAccessToken(userA, identityProviderId);
        await api.scim.createSCIMUser(userB, scimToken);
      });

      await test.step('User B logs in', async () => {
        [idpPage] = await Promise.all([
          context.waitForEvent('page'),
          pages.singleSignOn().enterEmailOnSSOPage(`wire-${identityProviderId}`),
        ]);

        await idpPage.getByRole('textbox', {name: 'Username'}).fill(userB.email, {timeout: 20_000});
        await idpPage.getByRole('textbox', {name: 'Password'}).fill(userB.password);
        await idpPage.getByRole('button', {name: 'Sign In'}).click();
        await modals.confirm().clickAction();
      });

      await test.step('User B opens account settings', async () => {
        await components.conversationSidebar().clickPreferencesButton();
        await pages.settings().clickAccountButton();
      });

      await test.step('User B changes profile image', async () => {
        await pages.account().uploadProfilePicture(getImageFilePath());
      });

      await test.step('User B tries to change name, username, and email', async () => {
        await expect(pages.account().editDisplayNameButton).not.toBeVisible();
        await expect(pages.account().editUserNameButton).not.toBeVisible();
        await expect(pages.account().editEmailButton).not.toBeVisible();
      });
    },
  );
});
