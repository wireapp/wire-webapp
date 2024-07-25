/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {render} from '@testing-library/react';

import {Runtime} from '@wireapp/commons';

import {Preferences} from './Preferences';

describe('Preferences', () => {
  const defaultParams = {
    teamRepository: {getTeam: jest.fn()},
    preferenceNotificationRepository: {getNotifications: jest.fn()},
    onPreferenceItemClick: jest.fn(),
  };

  it('renders the right preferences items', () => {
    jest.spyOn(Runtime, 'isDesktopApp').mockReturnValue(false);
    jest.spyOn(Runtime, 'isSupportingLegacyCalling').mockReturnValue(false);
    const {getByText, queryByText} = render(<Preferences {...defaultParams} />);
    expect(getByText('preferencesAccount')).not.toBeNull();
    expect(getByText('preferencesDevices')).not.toBeNull();
    expect(getByText('preferencesOptions')).not.toBeNull();
    expect(queryByText('preferencesAbout')).not.toBeNull();
    expect(queryByText('preferencesAV')).toBeNull();
  });

  it('renders the a/v section in a desktop app', () => {
    jest.spyOn(Runtime, 'isDesktopApp').mockReturnValue(true);
    jest.spyOn(Runtime, 'isSupportingLegacyCalling').mockReturnValue(true);
    const {queryByText} = render(<Preferences {...defaultParams} />);
    expect(queryByText('preferencesAV')).not.toBeNull();
    expect(queryByText('preferencesAbout')).not.toBeNull();
  });

  it('renders the about section in a web app', () => {
    jest.spyOn(Runtime, 'isDesktopApp').mockReturnValue(false);
    jest.spyOn(Runtime, 'isSupportingLegacyCalling').mockReturnValue(false);
    const {queryByText} = render(<Preferences {...defaultParams} />);
    expect(queryByText('preferencesAV')).toBeNull();
    expect(queryByText('preferencesAbout')).not.toBeNull();
  });
});
