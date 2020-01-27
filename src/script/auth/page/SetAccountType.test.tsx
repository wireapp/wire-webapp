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
import {Config as ReadOnlyConfig} from '../../Config';
import {initialRootState} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import SetAccountType from './SetAccountType';

type Writable<T> = {
  -readonly [K in keyof T]: T[K];
};

type WriteableConfig = TypeUtil.RecursivePartial<Writable<typeof ReadOnlyConfig>>;

const Config: WriteableConfig = ReadOnlyConfig;

describe('when visiting the set account type page', () => {
  let wrapper: ReactWrapper;

  describe('and the account registration is disabled', () => {
    beforeAll(() => {
      Config.FEATURE = {
        ENABLE_ACCOUNT_REGISTRATION: false,
      };
    });

    afterAll(() => (Config.FEATURE = {}));

    it('redirects to the index page', () => {
      wrapper = mountComponent(
        <SetAccountType />,
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(wrapper.find('[data-uie-name="redirect-login"][to="/"]').exists())
        .withContext('Redirect is rendered')
        .toBe(true);
    });
  });

  describe('and the account registration is enabled', () => {
    beforeAll(() => {
      Config.FEATURE = {
        ENABLE_ACCOUNT_REGISTRATION: true,
      };
    });

    afterAll(() => (Config.FEATURE = {}));

    it('shows the Wire logo', () => {
      wrapper = mountComponent(
        <SetAccountType />,
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

    it('shows an option to create a private account', () => {
      wrapper = mountComponent(
        <SetAccountType />,
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(wrapper.find('[data-uie-name="go-register-personal"]').exists()).toBe(true);
    });

    it('shows an option to create a team', () => {
      wrapper = mountComponent(
        <SetAccountType />,
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(wrapper.find('[data-uie-name="go-register-team"]').exists()).toBe(true);
    });
  });
});
