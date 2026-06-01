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

import {expect, test} from '../../test.fixtures';
import {PageManager} from '../../pageManager';
import {faker} from '@faker-js/faker';

const ON_PREM_WEBAPP_URL = 'https://webapp.anta.wire.link';

test('On Prem Login Redirect', {tag: ['@TC-8757', '@regression']}, async ({context, createPage, api}) => {
  const domain = faker.internet.domainName();
  const email = `redirect-user@${domain}`;

  try {
    await test.step('Claim domain and configure on-prem redirect', async () => {
      await api.brig.claimDomain(domain);
    });

    const page = await createPage(context);
    const pageManager = PageManager.from(page);
    const {pages} = pageManager.webapp;

    await test.step('Open login page and enter email with claimed domain', async () => {
      await pageManager.openSSOPage();
      await pages.singleSignOn().enterEmailOnSSOPage(email);
      await pages.singleSignOn().ssoSignInButton.click();
    });

    await test.step('Verify connect-to-organization backend dialog is shown', async () => {
      await expect(pages.customBackend().title).toBeVisible();
      await expect(pages.customBackend().redirectWarningText).toBeVisible();
      await expect(pages.customBackend().adminInfoText).toBeVisible();
    });

    await test.step('Click connect and verify redirect to on-prem webapp', async () => {
      const urlPattern = new RegExp(ON_PREM_WEBAPP_URL.replace(/\./g, '\\.'));

      await Promise.all([
        page.waitForURL(urlPattern, {
          timeout: 20_000,
        }),
        pages.customBackend().connectButton.click(),
      ]);

      await expect(page).toHaveURL(urlPattern);
    });
  } finally {
    await test.step('Delete claimed domain registration', async () => {
      await api.brig.deleteDomainClaim(domain);
    });
  }
});
