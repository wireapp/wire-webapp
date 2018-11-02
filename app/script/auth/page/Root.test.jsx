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
import {mockStore, mountWithStore} from '../util/TestUtil';
import Root from './Root';

describe('Root', () => {
  describe('when opening the main path', () => {
    let store;
    let wrapper;

    beforeEach(() => {
      const state = {
        authState: {},
        languageState: {
          language: 'en',
        },
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      };

      store = mockStore(state, {actions: {cookieAction: {}}});
      wrapper = mountWithStore(<Root />, store);
    });

    it('shows the Wire logo', () => {
      expect(wrapper.find('[data-uie-name="ui-wire-logo"]').exists()).toBe(true);
    });

    it('shows an option to create a private account', () => {
      expect(wrapper.find('[data-uie-name="go-register-personal"]').exists()).toBe(true);
    });

    it('shows an option to create a team', () => {
      expect(wrapper.find('[data-uie-name="go-register-team"]').exists()).toBe(true);
    });

    it('shows an option to login', () => {
      expect(wrapper.find('[data-uie-name="go-login"]').exists()).toBe(true);
    });
  });
});
