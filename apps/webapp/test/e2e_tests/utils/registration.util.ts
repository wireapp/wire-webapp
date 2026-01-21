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

import {User} from '../data/user';
import {PageManager} from '../pageManager';

export const goToPersonalRegistration = async (pageManager: PageManager, email: string) => {
  const {pages} = pageManager.webapp;
  await pages.singleSignOn().isSSOPageVisible();
  await pages.singleSignOn().enterEmailOnSSOPage(email);
  await pages.welcome().clickCreateAccountButton();
  await pages.welcome().clickCreatePersonalAccountButton();
};

export const completeRegistrationForm = async (
  pageManager: PageManager,
  user: User,
  input: string | null = null,
  inputType = 'email',
) => {
  const registration = pageManager.webapp.pages.registration();
  await registration.fillInUserInfo(user);
  if (input) {
    if (inputType === 'email') {
      await registration.emailInput.fill(input);
    } else {
      await registration.passwordInput.fill(input);
      await registration.confirmPasswordInput.fill(input);
    }
  }
  await registration.toggleTermsCheckbox();
  await registration.clickSubmitButton();
};
