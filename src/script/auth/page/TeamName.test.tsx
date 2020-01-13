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

import {ReactWrapper} from 'enzyme';
import React from 'react';
import {initialRootState} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import TeamName from './TeamName';

describe('when entering a team name', () => {
  let wrapper: ReactWrapper;

  const teamNameInput = () => wrapper.find('[data-uie-name="enter-team-name"]').first();
  const doNextButton = () => wrapper.find('[data-uie-name="do-next"]').first();
  const errorMessage = () => wrapper.find('[data-uie-name="error-message"]').first();

  describe('the submit button', () => {
    it('is disabled if too few characters are entered', () => {
      wrapper = mountComponent(
        <TeamName />,
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(teamNameInput().props().required).toBe(true);
      expect(doNextButton().props().disabled).toBe(true);
    });

    it('is enabled when the minimum amount of characters is entered', () => {
      wrapper = mountComponent(
        <TeamName />,
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );
      const expectedTeamName = 'M';

      expect(doNextButton().props().disabled).toBe(true);

      teamNameInput().simulate('change', {target: {value: expectedTeamName}});

      expect(doNextButton().props().disabled).toBe(false);
    });

    it('is disabled if previous submit with same value failed', () => {
      wrapper = mountComponent(
        <TeamName />,
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );
      const expectedTeamName = 'M';
      const expectedValidTeamName = 'My Team';

      expect(doNextButton().props().disabled).toBe(true);

      teamNameInput().simulate('change', {target: {value: expectedTeamName}});

      expect(doNextButton().props().disabled).toBe(false);

      doNextButton().simulate('click');

      expect(doNextButton().props().disabled).toBe(true);

      teamNameInput().simulate('change', {target: {value: expectedValidTeamName}});

      expect(doNextButton().props().disabled).toBe(false);
    });

    it('is disabled when prefilled with too few characters', () => {
      wrapper = mountComponent(
        <TeamName />,
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );
      wrapper.setProps({teamName: ''});

      expect(doNextButton().props().disabled).toBe(true);
    });
  });

  describe('an error message', () => {
    it('appears if too few characters are entered', () => {
      wrapper = mountComponent(
        <TeamName />,
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );
      const expectedTeamName = 'M';
      const expectedErrorMessage = 'Enter a name with at least 2 characters';

      teamNameInput().simulate('change', {target: {value: expectedTeamName}});

      expect(teamNameInput().props().value).toBe(expectedTeamName);

      doNextButton().simulate('click');

      expect(errorMessage().text()).toBe(expectedErrorMessage);
    });

    it('appears when input gets trimmed', () => {
      wrapper = mountComponent(
        <TeamName />,
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );
      const actualTeamName = '  ';
      const expectedTeamName = '  ';
      const expectedErrorMessage = 'Enter a name with at least 2 characters';

      teamNameInput().simulate('change', {target: {value: actualTeamName}});

      expect(teamNameInput().props().value).toBe(expectedTeamName);

      doNextButton().simulate('click');

      expect(errorMessage().text()).toBe(expectedErrorMessage);
    });
  });
});
