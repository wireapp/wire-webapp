/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

import React from 'react';
import {mockStore, mountWithIntl, mountWithStore} from '../util/TestUtil';
import TeamName from './TeamName';

describe('when entering a team name', () => {
  let store;
  let wrapper;

  beforeEach(() => {
    const state = {
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
        },
        error: null,
        fetched: false,
        fetching: false,
        isAuthenticated: false,
        isInTeamFlow: false,
      },
      languageState: {
        language: 'en',
      },
    };

    store = mockStore(state, {mixpanel: {track: () => 1}});
    wrapper = mountWithIntl(<TeamName />, store);
  });

  it(`doesn\'t show a next button if too few characters are entered`, () => {
    const teamNameInput = wrapper.find('[data-uie-name="enter-team-name"]').first();
    const doNextButton = wrapper.find('[data-uie-name="do-next"]').first();
    expect(teamNameInput.props().required).toBe(true);
    expect(doNextButton.props().disabled).toBe(true);
  });

  it('shows a next button when the minimum amount of characters are entered', () => {
    const teamNameInput = wrapper.find('[data-uie-name="enter-team-name"]').first();
    const doNextButton = wrapper.find('[data-uie-name="do-next"]').first();
    expect(teamNameInput.props().required).toBe(true);
    expect(doNextButton.props().disabled).toBe(true);
  });
});

describe(`when clicking on "what are teams"`, () => {
  it(`opens our company's website in a new browser tab`, () => {
  });

  it(`opens our company's website showing a list of team features`, () => {
  });
});
