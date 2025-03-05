/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {PropertiesRepository} from 'src/script/properties/PropertiesRepository';
import {PropertiesService} from 'src/script/properties/PropertiesService';
import {PROPERTIES_TYPE} from 'src/script/properties/PropertiesType';
import {SelfService} from 'src/script/self/SelfService';

import {GroupAvatar} from './GroupAvatar';

describe('GroupAvatar', () => {
  it('renders avatar', async () => {
    const propertiesRepository = new PropertiesRepository(new PropertiesService(), new SelfService());
    propertiesRepository.savePreference(PROPERTIES_TYPE.INTERFACE.THEME, 'dark');
    const {getByTestId} = render(<GroupAvatar propertiesRepository={propertiesRepository} />);
    const avatarWrapper = getByTestId('group-avatar-box-wrapper');

    expect(avatarWrapper.children).toHaveLength(1);
  });
});
