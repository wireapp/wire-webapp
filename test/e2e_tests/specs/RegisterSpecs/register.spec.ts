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
import {completeRegistrationForm, goToPersonalRegistration} from 'test/e2e_tests/utils/registration.util';
import {addCreatedUser, removeCreatedUser} from 'test/e2e_tests/utils/tearDown.util';

import {test, expect} from '../../test.fixtures';

test.describe('registration personal account', () => {
  // Helper function to handle common registration steps
  test.slow();

  test.describe('email registration used', () => {
    const userA = getUser();

    test.beforeAll(async ({api}) => {
      await api.createPersonalUser(userA);
      addCreatedUser(userA);
    });

    test(
      'I want to be notified if the email address I entered during registration has already been registered',
      {tag: ['@TC-1623', '@TC-1640', '@regression']},
      async ({pageManager}) => {
        await pageManager.openMainPage();
        const {pages} = pageManager.webapp;

        await goToPersonalRegistration(pageManager, userA.email);

        await completeRegistrationForm(pageManager, userA);
        await expect(pages.registration().errorLabel).toHaveText(
          'This email address has already been registered. Learn more',
        );

        expect(pageManager.webapp.pages.registration().passwordPolicy).toHaveText(
          'Use at least 8 characters, with one lowercase letter, one capital letter, a number, and a special character.',
        );
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
      const {pages} = pageManager.webapp;
      const incorrectEmail = 'nope@wearezeta.com';
      const user = getUser();

      await pageManager.openMainPage();
      await goToPersonalRegistration(pageManager, user.email);
      await completeRegistrationForm(pageManager, user, incorrectEmail, 'email');

      await expect(pages.registration().errorLabel).toHaveText(
        'Something went wrong. Please reload the page and try again',
      );
    },
  );
  const errorMessagePW =
    'Use at least 8 characters, with one lowercase letter, one capital letter, a number, and a special character.';
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
      errorMessage: errorMessagePW,
    },
    {
      name: 'I should not be able to submit a password which does not have any Capital letter',
      tag: ['@TC-1635', '@regression'],
      input: 'pass!234567',
      inputType: 'password',
      errorMessage: errorMessagePW,
    },
    {
      name: 'I should not be able to submit a password which does not have any number',
      tag: ['@TC-1636', '@regression'],
      input: 'testPassword!',
      inputType: 'password',
      errorMessage:
        'Use at least 8 characters, with one lowercase letter, one capital letter, a number, and a special character.',
    },
    {
      name: 'I should not be able to submit a password which does not have any special letter',
      tag: ['@TC-1637', '@TC-1641', '@regression'],
      input: 'testPassword1',
      inputType: 'password',
      errorMessage:
        'Use at least 8 characters, with one lowercase letter, one capital letter, a number, and a special character.',
    },
  ];

  testCases.forEach(testData => {
    test(`${testData.name}`, {tag: testData.tag}, async ({pageManager}) => {
      const {pages} = pageManager.webapp;
      const user = getUser();

      await pageManager.openMainPage();
      await goToPersonalRegistration(pageManager, user.email);
      await completeRegistrationForm(pageManager, user, testData.input, testData.inputType);

      await expect(pages.registration().errorLabel).toHaveText(testData.errorMessage);

      const errorColor = await pages
        .registration()
        .errorLabel.locator('span')
        .evaluate(el => window.getComputedStyle(el).color);
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
      const user = getUser();
      await pageManager.openMainPage();

      const requestPromise = pageManager.waitForRequest('*/**/activate/send');

      await goToPersonalRegistration(pageManager, user.email);
      await completeRegistrationForm(pageManager, user, testData.input, testData.inputType);
      await requestPromise;

      await expect(pageManager.webapp.pages.emailVerification().verificationCodeInputLabel).toBeVisible();
    });
  });
});
