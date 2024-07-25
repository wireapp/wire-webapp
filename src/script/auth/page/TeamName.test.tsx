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

import {fireEvent} from '@testing-library/react';

import {TeamName} from './TeamName';

import {ValidationError} from '../module/action/ValidationError';
import {initialRootState} from '../module/reducer';
import {initialAuthState} from '../module/reducer/authReducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';

describe('when entering a team name', () => {
  describe('the submit button', () => {
    it('is disabled if too few characters are entered', () => {
      const {getByTestId} = mountComponent(<TeamName />, mockStoreFactory()(initialRootState));

      const teamNameInput = getByTestId('enter-team-name') as HTMLInputElement;
      const nextButton = getByTestId('do-next') as HTMLButtonElement;
      expect(teamNameInput.required).toBe(true);
      expect(nextButton.disabled).toBe(true);
    });

    it('is enabled when the minimum amount of characters is entered', () => {
      const {getByTestId} = mountComponent(<TeamName />, mockStoreFactory()(initialRootState));
      const expectedTeamName = 'M';

      const teamNameInput = getByTestId('enter-team-name') as HTMLInputElement;
      const nextButton = getByTestId('do-next') as HTMLButtonElement;
      expect(nextButton.disabled).toBe(true);
      fireEvent.change(teamNameInput, {target: {value: expectedTeamName}});

      expect(nextButton.disabled).toBe(false);
    });

    it('is disabled if previous submit with same value failed', () => {
      const {getByTestId} = mountComponent(<TeamName />, mockStoreFactory()(initialRootState));
      const expectedTeamName = 'M';
      const expectedValidTeamName = 'My Team';

      const teamNameInput = getByTestId('enter-team-name') as HTMLInputElement;
      const nextButton = getByTestId('do-next') as HTMLButtonElement;

      expect(nextButton.disabled).toBe(true);
      fireEvent.change(teamNameInput, {target: {value: expectedTeamName}});

      expect(nextButton.disabled).toBe(false);
      fireEvent.click(nextButton);

      expect(nextButton.disabled).toBe(true);
      fireEvent.change(teamNameInput, {target: {value: expectedValidTeamName}});

      expect(nextButton.disabled).toBe(false);
    });

    it('is disabled when prefilled with too few characters', () => {
      const {getByTestId} = mountComponent(
        <TeamName />,
        mockStoreFactory()({
          ...initialRootState,
          authState: {
            ...initialAuthState,
            account: {
              team: {
                name: '',
              },
            },
          },
        }),
      );

      const nextButton = getByTestId('do-next') as HTMLButtonElement;
      expect(nextButton.disabled).toBe(true);
    });
  });

  describe('an error message', () => {
    it('appears if too few characters are entered', () => {
      const {getByTestId} = mountComponent(<TeamName />, mockStoreFactory()(initialRootState));
      const expectedTeamName = 'M';
      const nextButton = getByTestId('do-next') as HTMLButtonElement;
      const teamNameInput = getByTestId('enter-team-name') as HTMLInputElement;

      fireEvent.change(teamNameInput, {target: {value: expectedTeamName}});

      expect(teamNameInput.value).toBe(expectedTeamName);
      fireEvent.click(nextButton);

      const error = getByTestId('error-message');
      expect(error.dataset.uieValue).toBe(ValidationError.FIELD.NAME.PATTERN_MISMATCH);
    });

    it('appears when input gets trimmed', () => {
      const {getByTestId} = mountComponent(<TeamName />, mockStoreFactory()(initialRootState));
      const expectedTeamName = '  ';
      const nextButton = getByTestId('do-next') as HTMLButtonElement;
      const teamNameInput = getByTestId('enter-team-name') as HTMLInputElement;

      fireEvent.change(teamNameInput, {target: {value: expectedTeamName}});

      expect(teamNameInput.value).toBe(expectedTeamName);
      fireEvent.click(nextButton);

      const error = getByTestId('error-message');
      expect(error.dataset.uieValue).toBe(ValidationError.FIELD.NAME.VALUE_MISSING);
    });
  });
});
