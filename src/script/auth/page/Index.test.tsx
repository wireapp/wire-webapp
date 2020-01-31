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

import {TypeUtil} from '@wireapp/commons';
import {ReactWrapper} from 'enzyme';
import React from 'react';
import {Config, Configuration} from '../../Config';
import {initialRootState} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import Index from './Index';

describe('when visiting the set account type page', () => {
  let wrapper: ReactWrapper;

  describe('and the account registration is disabled', () => {
    beforeAll(() => {
      spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
        FEATURE: {
          ENABLE_ACCOUNT_REGISTRATION: false,
        },
      });
    });

    it('does not show create account button', () => {
      wrapper = mountComponent(
        <Index />,
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(wrapper.find('Button [data-uie-name="go-set-account-type"]').exists()).toBe(false);
    });
  });

  describe('and the account registration is enabled', () => {
    beforeAll(() => {
      spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
        FEATURE: {
          ENABLE_ACCOUNT_REGISTRATION: true,
        },
      });
    });

    it('shows the Wire logo', () => {
      wrapper = mountComponent(
        <Index />,
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(wrapper.find('[data-uie-name="ui-wire-logo"]').exists()).toBe(true);
    });

    it('shows an option to create an account', () => {
      wrapper = mountComponent(
        <Index />,
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(wrapper.find('Button [data-uie-name="go-set-account-type"]').exists()).toBe(true);
    });

    it('shows an option to login', () => {
      wrapper = mountComponent(
        <Index />,
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(wrapper.find('Button [data-uie-name="go-login"]').exists()).toBe(true);
    });
  });
});
