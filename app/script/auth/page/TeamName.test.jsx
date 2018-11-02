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
import TeamName from './TeamName';

describe('when entering a team name', () => {
  let wrapper;

  const initialState = {
    authState: {
      account: {
        accent_id: undefined,
        assets: undefined,
        email: undefined,
        email_code: undefined,
        invitation_code: undefined,
        label: undefined,
        locale: undefined,
        name: undefined,
        password: undefined,
        phone: undefined,
        phone_code: undefined,
        team: undefined,
        termsAccepted: false,
      },
      currentFlow: null,
      error: null,
      fetched: false,
      fetching: false,
      isAuthenticated: false,
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

  const teamNameInput = () => wrapper.find('[data-uie-name="enter-team-name"]').first();
  const doNextButton = () => wrapper.find('[data-uie-name="do-next"]').first();
  const errorMessage = () => wrapper.find('[data-uie-name="error-message"]').first();

  describe('the submit button', () => {
    it('is disabled if too few characters are entered', () => {
      wrapper = mountWithIntl(<TeamName />, mockStore(initialState));

      expect(teamNameInput().props().required).toBe(true);
      expect(doNextButton().props().disabled).toBe(true);
    });

    it('is enabled when the minimum amount of characters is entered', done => {
      wrapper = mountWithIntl(<TeamName />, mockStore(initialState));
      const expectedTeamName = 'M';

      expect(doNextButton().props().disabled).toBe(true);

      teamNameInput().simulate('change', {target: {value: expectedTeamName}});

      expect(doNextButton().props().disabled).toBe(false);

      done();
    });

    it('is disabled if previous submit with same value failed', done => {
      wrapper = mountWithIntl(<TeamName />, mockStore(initialState));
      const expectedTeamName = 'M';
      const expectedValidTeamName = 'My Team';

      expect(doNextButton().props().disabled).toBe(true);

      teamNameInput().simulate('change', {target: {value: expectedTeamName}});

      expect(doNextButton().props().disabled).toBe(false);

      doNextButton().simulate('click');

      expect(doNextButton().props().disabled).toBe(true);

      teamNameInput().simulate('change', {target: {value: expectedValidTeamName}});

      expect(doNextButton().props().disabled).toBe(false);

      done();
    });

    it('is disabled when prefilled with too few characters', done => {
      wrapper = mountWithIntl(<TeamName />, mockStore(initialState));
      wrapper.setProps({teamName: ''});

      expect(doNextButton().props().disabled).toBe(true);
      done();
    });
  });

  describe('an error message', () => {
    it('appears if too few characters are entered', done => {
      wrapper = mountWithIntl(<TeamName />, mockStore(initialState));
      const expectedTeamName = 'M';
      const expectedErrorMessage = 'Enter a name with at least 2 characters';

      teamNameInput().simulate('change', {target: {value: expectedTeamName}});

      expect(teamNameInput().props().value).toBe(expectedTeamName);

      doNextButton().simulate('click');

      expect(errorMessage().text()).toBe(expectedErrorMessage);

      done();
    });

    it('appears when input gets trimmed', done => {
      wrapper = mountWithIntl(<TeamName />, mockStore(initialState));
      const actualTeamName = '  ';
      const expectedTeamName = '  ';
      const expectedErrorMessage = 'Enter a name with at least 2 characters';

      teamNameInput().simulate('change', {target: {value: actualTeamName}});

      expect(teamNameInput().props().value).toBe(expectedTeamName);

      doNextButton().simulate('click');

      expect(errorMessage().text()).toBe(expectedErrorMessage);

      done();
    });
  });
});
