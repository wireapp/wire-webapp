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

import {SetAccountType} from './SetAccountType';

import {Config, Configuration} from '../../Config';
import {initialRootState} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Navigate: function Navigate({to}: any) {
    return <span>Navigate to {to}</span>;
  },
}));

const personalAccountButtonId = 'go-register-personal';
const teamAccountButtonId = 'go-register-team';
const logoId = 'ui-wire-logo';

describe('when visiting the set account type page', () => {
  describe('and the account registration is disabled', () => {
    beforeAll(() => {
      spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
        FEATURE: {
          ENABLE_ACCOUNT_REGISTRATION: false,
        },
        URL: {
          TEAMS_BASE: undefined,
        },
      });
    });

    it('redirects to the index page', () => {
      const {getByText} = mountComponent(<SetAccountType />, mockStoreFactory()(initialRootState));
      const redirect = getByText('Navigate to /');

      expect(redirect).not.toBeNull();
    });
  });

  describe('and the account registration is enabled', () => {
    beforeAll(() => {
      spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
        FEATURE: {
          ENABLE_ACCOUNT_REGISTRATION: true,
        },
        URL: {
          TEAMS_BASE: undefined,
        },
      });
    });

    it('shows the Wire logo', () => {
      const {getByTestId} = mountComponent(<SetAccountType />, mockStoreFactory()(initialRootState));
      const logo = getByTestId(logoId);

      expect(logo).not.toBeNull();
    });

    it('shows an option to create a private account', () => {
      const {getByTestId} = mountComponent(<SetAccountType />, mockStoreFactory()(initialRootState));
      const personalAccountButton = getByTestId(personalAccountButtonId);

      expect(personalAccountButton).not.toBeNull();
    });

    it('shows an option to create a team', () => {
      const {getByTestId} = mountComponent(<SetAccountType />, mockStoreFactory()(initialRootState));

      const teamAccountButton = getByTestId(teamAccountButtonId);
      expect(teamAccountButton).not.toBeNull();
    });
  });
});
