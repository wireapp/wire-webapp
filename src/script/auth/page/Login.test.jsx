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

import * as React from 'react';
import {mockStore, mountWithIntl} from '../util/TestUtil';
import Login from './Login';
import * as config from '../config';

describe('when visiting the login page', () => {
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

  const backButton = () => wrapper.find('[data-uie-name="go-index"]').first();

  describe('and the account registration is disabled', () => {
    it('the back button is hidden', () => {
      config.FEATURE.ENABLE_ACCOUNT_REGISTRATION = false;
      wrapper = mountWithIntl(<Login />, mockStore(initialState));
      config.FEATURE.ENABLE_ACCOUNT_REGISTRATION = true;

      expect(backButton().exists()).toBe(false);
    });
  });

  describe('and the account registration is enabled', () => {
    it('the back button is shown', () => {
      config.FEATURE.ENABLE_ACCOUNT_REGISTRATION = true;
      wrapper = mountWithIntl(<Login />, mockStore(initialState));

      expect(backButton().exists()).toBe(true);
    });
  });
});
