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
import {webAppPath} from 'test/e2e_tests/pageManager';
import {RegistrationPage} from 'test/e2e_tests/pageManager/webapp/pages/registration.page';
import {addCreatedUser, removeCreatedUser} from 'test/e2e_tests/utils/tearDown.util';

import {test, expect} from '../../test.fixtures';

test.describe('registration personal account', () => {
  const url = `${webAppPath}auth/#/createaccount`;

  // Helper function to handle common registration steps
  const completeRegistrationForm = async (
    reg: RegistrationPage,
    user: User,
    input: string | null = null,
    inputType = 'email',
  ) => {
    await reg.fillInUserInfo(user);
    if (input) {
      if (inputType === 'email') {
        await reg.emailInput.fill(input);
      } else {
        await reg.passwordInput.fill(input);
        await reg.confirmPasswordInput.fill(input);
      }
    }
    await reg.toggleTermsCheckbox();
    await reg.clickSubmitButton();
  };

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
      async ({pageManager}) => {
        await pageManager.openUrl(url);

        const reg = pageManager.webapp.pages.registration();
        await completeRegistrationForm(reg, userA);
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
    async ({pageManager}) => {
      const incorrectEmail = 'nope@wearezeta.com';
      await pageManager.openUrl(url);
      const user = getUser();
      const reg = pageManager.webapp.pages.registration();

      await completeRegistrationForm(reg, user, incorrectEmail, 'email');

      const text = await reg.errorLabel.innerText();
      expect(text).toContain('Something went wrong');
    },
  );

  const testCases = [
    {
      name: 'I want to see an error message if email is not valid',
      tag: ['@TC-1627', '@regression'],
      input: 'blablablawire.engineering',
      inputType: 'email',
      errorMessage: 'Please enter a valid email address',
    },
    {
      name: 'I should not be able to submit a password less than 8 chars',
      tag: ['@TC-1634', '@regression'],
      input: '1234567',
      inputType: 'password',
      errorMessage: 'Use at least 8 characters',
    },
    {
      name: 'I should not be able to submit a password which does not have any Capital letter',
      tag: ['@TC-1635', '@regression'],
      input: 'pass!234567',
      inputType: 'password',
      errorMessage: 'capital letter',
    },
    {
      name: 'I should not be able to submit a password which does not have any number',
      tag: ['@TC-1636', '@regression'],
      input: 'testPassword!',
      inputType: 'password',
      errorMessage: 'a number',
    },
    {
      name: 'I should not be able to submit a password which does not have any special letter',
      tag: ['@TC-1637', '@TC-1641', '@regression'],
      input: 'testPassword1',
      inputType: 'password',
      errorMessage: 'special character',
    },
  ];

  testCases.forEach(testData => {
    test(`${testData.name}`, {tag: testData.tag}, async ({pageManager}) => {
      await pageManager.openUrl(url);
      const user = getUser();
      const reg = pageManager.webapp.pages.registration();

      await completeRegistrationForm(reg, user, testData.input, testData.inputType);

      const text = await reg.errorLabel.innerText();
      expect(text).toContain(testData.errorMessage);

      const errorColor = await reg.errorLabel.locator('span').evaluate(el => window.getComputedStyle(el).color);
      expect(errorColor).toBe('rgb(194, 0, 19)');
    });
  });

  const testCasesPassword = [
    {
      name: 'I want to submit a password containing emojis',
      tag: ['@TC-1642', '@regression'],
      input: 'test😅😅😅Password😅1',
      inputType: 'password',
    },
    {
      name: 'I want to submit a password containing spaces',
      tag: ['@TC-1643', '@regression'],
      input: 'testPassword 1',
      inputType: 'password',
    },
  ];

  testCasesPassword.forEach(testData => {
    test(`${testData.name}`, {tag: testData.tag}, async ({pageManager}) => {
      await pageManager.openUrl(url);
      const user = getUser();
      const reg = pageManager.webapp.pages.registration();

      const page = await pageManager.getPage();
      const requestPromise = page.waitForRequest('*/**/activate/send');

      await completeRegistrationForm(reg, user, testData.input, testData.inputType);
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
