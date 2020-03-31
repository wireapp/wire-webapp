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
import {initialRootState, RootState, Api} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import SetAccountType from './SetAccountType';
import {Config, Configuration} from '../../Config';
import {MockStoreEnhanced} from 'redux-mock-store';
import {ThunkDispatch} from 'redux-thunk';
import {AnyAction} from 'redux';
import {History} from 'history';

class SetAccountTypePage {
  private readonly driver: ReactWrapper;

  constructor(
    store: MockStoreEnhanced<TypeUtil.RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
    history?: History<any>,
  ) {
    this.driver = mountComponent(<SetAccountType />, store, history);
  }

  getPersonalAccountButton = () => this.driver.find('a[data-uie-name="go-register-personal"]');
  getTeamAccountButton = () => this.driver.find('a[data-uie-name="go-register-team"]');
  getLogo = () => this.driver.find('[data-uie-name="ui-wire-logo"]');
  getIndexRedirect = () => this.driver.find('[data-uie-name="redirect-login"][to="/"]');

  clickPersonalAccountButton = () => this.getPersonalAccountButton().simulate('click');
  clickTeamAccountButton = () => this.getTeamAccountButton().simulate('click');
}

describe('when visiting the set account type page', () => {
  describe('and the account registration is disabled', () => {
    beforeAll(() => {
      spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
        FEATURE: {
          ENABLE_ACCOUNT_REGISTRATION: false,
        },
      });
    });

    it('redirects to the index page', () => {
      const accountTypePage = new SetAccountTypePage(
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(accountTypePage.getIndexRedirect().exists()).withContext('Redirect is rendered').toBe(true);
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
      const accountTypePage = new SetAccountTypePage(
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(accountTypePage.getLogo().exists()).withContext('logo is shown').toBe(true);
    });

    it('shows an option to create a private account', () => {
      const accountTypePage = new SetAccountTypePage(
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(accountTypePage.getPersonalAccountButton().exists())
        .withContext('personal account button is shown')
        .toBe(true);
    });

    it('shows an option to create a team', () => {
      const accountTypePage = new SetAccountTypePage(
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(accountTypePage.clickTeamAccountButton().exists()).withContext('team account button is shown').toBe(true);
    });
  });
});
