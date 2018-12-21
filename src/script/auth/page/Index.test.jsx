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
import Index from './Index';
import * as config from '../config';

describe('when visiting the index page', () => {
  let wrapper;
  const initialState = {
    authState: {
      account: {},
    },
    languageState: {
      language: 'en',
    },
    runtimeState: {
      hasCookieSupport: true,
      hasIndexedDbSupport: true,
      isSupportedBrowser: true,
    },
  };

  describe('and the account registration is disabled', () => {
    it('redirects to the login page', () => {
      config.FEATURE.ENABLE_ACCOUNT_REGISTRATION = false;
      wrapper = mountWithIntl(<Index />, mockStore(initialState));
      config.FEATURE.ENABLE_ACCOUNT_REGISTRATION = true;

      expect(wrapper.find('[data-uie-name="redirect-login"]').exists()).toBe(true);
    });
  });

  it('shows the Wire logo', () => {
    wrapper = mountWithIntl(<Index />, mockStore(initialState));

    expect(wrapper.find('[data-uie-name="ui-wire-logo"]').exists()).toBe(true);
  });

  it('shows an option to create a private account', () => {
    wrapper = mountWithIntl(<Index />, mockStore(initialState));

    expect(wrapper.find('[data-uie-name="go-register-personal"]').exists()).toBe(true);
  });

  it('shows an option to create a team', () => {
    wrapper = mountWithIntl(<Index />, mockStore(initialState));

    expect(wrapper.find('[data-uie-name="go-register-team"]').exists()).toBe(true);
  });

  it('shows an option to login', () => {
    wrapper = mountWithIntl(<Index />, mockStore(initialState));

    expect(wrapper.find('[data-uie-name="go-login"]').exists()).toBe(true);
  });
});
