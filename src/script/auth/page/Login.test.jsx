/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import React from 'react';
import {mockStore, mountComponent} from '../util/TestUtil';
import Login from './Login';
import {Config} from '../config';

describe('"Login"', () => {
  let wrapper;
  const initialState = {
    authState: {
      account: {},
    },
    clientState: {
      hasHistory: false,
    },
    cookieState: {},
    languageState: {
      language: 'en',
    },
    runtimeState: {
      hasCookieSupport: true,
      hasIndexedDbSupport: true,
      isSupportedBrowser: true,
    },
    selfState: {},
  };

  beforeAll(() => {
    Config.FEATURE = {
      DEFAULT_LOGIN_TEMPORARY_CLIENT: false,
      ENABLE_ACCOUNT_REGISTRATION: true,
    };
  });

  afterAll(() => (Config.FEATURE = {}));

  const backButton = () => wrapper.find('[data-uie-name="go-index"]').first();
  const emailInput = () => wrapper.find('[data-uie-name="enter-email"]').first();
  const passwordInput = () => wrapper.find('[data-uie-name="enter-password"]').first();
  const loginButton = () => wrapper.find('[data-uie-name="do-sign-in"]').first();

  it('has disabled submit button as long as one input is empty', () => {
    wrapper = mountComponent(<Login />, mockStore(initialState));

    expect(emailInput().exists()).toBe(true);
    expect(passwordInput().exists()).toBe(true);
    expect(loginButton().exists()).toBe(true);

    expect(loginButton().props().disabled).toBe(true);
    emailInput().simulate('change', {target: {value: 'e'}});

    expect(loginButton().props().disabled).toBe(true);
    passwordInput().simulate('change', {target: {value: 'p'}});

    expect(loginButton().props().disabled).toBe(false);
  });

  describe('with account registration disabled', () => {
    beforeAll(() => {
      Config.FEATURE = {
        ENABLE_ACCOUNT_REGISTRATION: false,
      };
    });

    afterAll(() => (Config.FEATURE = {}));

    it('hides the back button', () => {
      Config.FEATURE.ENABLE_ACCOUNT_REGISTRATION = false;
      wrapper = mountComponent(<Login />, mockStore(initialState));
      Config.FEATURE.ENABLE_ACCOUNT_REGISTRATION = true;

      expect(backButton().exists()).toBe(false);
    });
  });

  describe('with account registration enabled', () => {
    it('shows the back button', () => {
      Config.FEATURE.ENABLE_ACCOUNT_REGISTRATION = true;
      wrapper = mountComponent(<Login />, mockStore(initialState));

      expect(backButton().exists()).toBe(true);
    });
  });
});
