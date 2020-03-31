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
import {initialRootState, RootState, Api} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import TeamName from './TeamName';
import {MockStoreEnhanced} from 'redux-mock-store';
import {TypeUtil} from '@wireapp/commons';
import {ThunkDispatch} from 'redux-thunk';
import {AnyAction} from 'redux';
import {History} from 'history';
import {initialAuthState} from '../module/reducer/authReducer';
import {ValidationError} from '../module/action/ValidationError';

class SetTeamNamePage {
  private readonly driver: ReactWrapper;

  constructor(
    store: MockStoreEnhanced<TypeUtil.RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
    history?: History<any>,
  ) {
    this.driver = mountComponent(<TeamName />, store, history);
  }

  getTeamNameInput = () => this.driver.find('input[data-uie-name="enter-team-name"]');
  getNextButton = () => this.driver.find('button[data-uie-name="do-next"]');
  getErrorMessage = (errorLabel?: string) =>
    this.driver.find(`[data-uie-name="error-message"]${errorLabel ? `[data-uie-value="${errorLabel}"]` : ''}`);

  clickNextButton = () => this.getNextButton().simulate('click');

  enterTeamName = (value: string) => this.getTeamNameInput().simulate('change', {target: {value}});

  update = () => this.driver.update();
}

describe('when entering a team name', () => {
  describe('the submit button', () => {
    it('is disabled if too few characters are entered', () => {
      const setTeamNamePage = new SetTeamNamePage(
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(setTeamNamePage.getTeamNameInput().props().required).toBe(true);
      expect(setTeamNamePage.getNextButton().props().disabled).toBe(true);
    });

    it('is enabled when the minimum amount of characters is entered', () => {
      const setTeamNamePage = new SetTeamNamePage(
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

      expect(setTeamNamePage.getNextButton().props().disabled).toBe(true);
      setTeamNamePage.enterTeamName(expectedTeamName);

      expect(setTeamNamePage.getNextButton().props().disabled).toBe(false);
    });

    it('is disabled if previous submit with same value failed', () => {
      const setTeamNamePage = new SetTeamNamePage(
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

      expect(setTeamNamePage.getNextButton().props().disabled).toBe(true);
      setTeamNamePage.enterTeamName(expectedTeamName);

      expect(setTeamNamePage.getNextButton().props().disabled).toBe(false);
      setTeamNamePage.clickNextButton();

      expect(setTeamNamePage.getNextButton().props().disabled).toBe(true);
      setTeamNamePage.enterTeamName(expectedValidTeamName);

      expect(setTeamNamePage.getNextButton().props().disabled).toBe(false);
    });

    it('is disabled when prefilled with too few characters', () => {
      const setTeamNamePage = new SetTeamNamePage(
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
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(setTeamNamePage.getNextButton().props().disabled).withContext('Submit button is disabled').toBe(true);
    });
  });

  describe('an error message', () => {
    it('appears if too few characters are entered', () => {
      const setTeamNamePage = new SetTeamNamePage(
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

      setTeamNamePage.enterTeamName(expectedTeamName);

      expect(setTeamNamePage.getTeamNameInput().props().value).toBe(expectedTeamName);
      setTeamNamePage.clickNextButton();

      expect(setTeamNamePage.getErrorMessage(ValidationError.FIELD.NAME.PATTERN_MISMATCH).exists())
        .withContext('pattern mismatch error is shown')
        .toBe(true);
    });

    it('appears when input gets trimmed', () => {
      const setTeamNamePage = new SetTeamNamePage(
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

      setTeamNamePage.enterTeamName(actualTeamName);

      expect(setTeamNamePage.getTeamNameInput().props().value).toBe(expectedTeamName);
      setTeamNamePage.clickNextButton();

      expect(setTeamNamePage.getErrorMessage(ValidationError.FIELD.NAME.VALUE_MISSING).exists())
        .withContext('value missing error is shown')
        .toBe(true);
    });
  });
});
