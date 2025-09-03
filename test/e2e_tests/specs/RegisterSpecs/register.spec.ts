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
import {webAppPath} from 'test/e2e_tests/pageManager';
import {addCreatedUser, removeCreatedUser} from 'test/e2e_tests/utils/tearDown.util';

import {test, expect} from '../../test.fixtures';

test.describe('registration personal account', () => {
  const url = `${webAppPath}auth/#/createaccount`;

  test.beforeAll(async ({pageManager}) => {
    await pageManager.openMainPage();
  });

  test.slow();

  test.describe('email registration used', () => {
    const userA = getUser();

    test.beforeAll(async ({api}) => {
      await api.createPersonalUser(userA);
      addCreatedUser(userA);
    });

    test(
      'I want to be notified if the email address I entered during registration has already been registered',
      {tag: ['@TC-1623', '@regression']},
      async ({pageManager, api}) => {
        await pageManager.openUrl(url);

        const reg = pageManager.webapp.pages.registration();
        await reg.fillInUserInfo(userA);
        await reg.toggleTermsCheckbox();
        await reg.clickSubmitButton();

        const text = await reg.errorLabel.innerText();
        expect(text).toContain('This email address has already been registered.');
      },
    );

    test.afterAll(async ({api}) => {
      await removeCreatedUser(api, userA);
    });
  });

  test(
    'I want to see an error message if the email address is blacklisted',
    {tag: ['@TC-1624', '@regression']},
    async ({pageManager, api}) => {
      const incorrectEmail = 'nope@wearezeta.com';
      await pageManager.openUrl(url);
      const user = getUser();

      const reg = pageManager.webapp.pages.registration();
      await reg.fillInUserInfo(user);
      await reg.emailInput.fill(incorrectEmail);
      await reg.toggleTermsCheckbox();

      await reg.clickSubmitButton();
      const text = await reg.errorLabel.innerText();

      expect(text).toContain('Something went wrong');
    },
  );

  const testCases = [
    {
      name: 'I want to see an error message if email is not valid',
      tag: ['@TC-1627', '@regression'],
      input: 'blablablawire.engineering',
      errorMessage: 'Please enter a valid email address',
    },
    {
      name: 'I should not be able to submit a password less than 8 chars',
      tag: ['@TC-1634', '@regression'],
      input: '1234567',
      errorMessage: 'Use at least 8 characters',
    },
    {
      name: 'I should not be able to submit a password which does not have any number',
      tag: ['@TC-1636', '@regression'],
      input: 'testPassword!',
      errorMessage: 'a number',
    },
    {
      name: 'I should not be able to submit a password which does not have any special letter',
      tag: ['@TC-1637', '@TC-1641', '@regression'],
      input: 'testPassword1',
      errorMessage: 'special character',
    },
  ];

  testCases.forEach(testData => {
    test(`${testData.name}`, {tag: testData.tag}, async ({pageManager}) => {
      await pageManager.openUrl(url);
      const user = getUser();

      const reg = pageManager.webapp.pages.registration();
      await reg.fillInUserInfo(user);

      if (testData.name.includes('email')) {
        await reg.emailInput.fill(testData.input);
      } else {
        await reg.passwordInput.fill(testData.input);
        await reg.confirmPasswordInput.fill(testData.input);
      }

      await reg.toggleTermsCheckbox();
      await reg.clickSubmitButton();

      const text = await reg.errorLabel.innerText();
      expect(text).toContain(testData.errorMessage);

      const errorColor = await reg.errorLabel.locator('span').evaluate(el => window.getComputedStyle(el).color);
      // Assuming the error color is a specific red RGB value
      expect(errorColor).toBe('rgb(194, 0, 19)');
    });
  });

  const testCasesPassword = [
    {
      name: 'I want to submit a password containing emojis',
      tag: ['@TC-1632', '@TC-1641', '@regression'],
      input: 'test😅😅😅Password😅1',
      errorMessage: 'special character',
    },
    {
      name: 'I want to submit a password containing spaces',
      tag: ['@TC-1643', '@regression'],
      input: 'testPassword 1',
      errorMessage: 'special character',
    },
  ];

  testCasesPassword.forEach(testData => {
    test(`${testData.name}`, {tag: testData.tag}, async ({pageManager}) => {
      await pageManager.openUrl(url);
      const user = getUser();

      const reg = pageManager.webapp.pages.registration();
      await reg.fillInUserInfo(user);

      if (testData.name.includes('email')) {
        await reg.emailInput.fill(testData.input);
      } else {
        await reg.passwordInput.fill(testData.input);
        await reg.confirmPasswordInput.fill(testData.input);
      }

      const page = await pageManager.getPage();

      const requestPromise = page.waitForRequest('*/**/activate/send');
      await reg.toggleTermsCheckbox();
      await reg.clickSubmitButton();
      await requestPromise;

      const emailVeri = pageManager.webapp.pages.emailVerification();
      await expect(emailVeri.verificationCodeInputLabel).toBeVisible();
    });
  });

  test(
    'I want to see the password policy in the set password step',
    {tag: ['@TC-1640', '@regression']},
    async ({pageManager}) => {
      await pageManager.openUrl(url);

      const reg = pageManager.webapp.pages.registration();

      const text = await reg.passwordPolicy.innerText();
      expect(text).toContain(
        'Use at least 8 characters, with one lowercase letter, one capital letter, a number, and a special character.',
      );
    },
  );
});
