/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import '@testing-library/jest-dom/jest-globals';
import {render} from '@testing-library/react';

import {Tooltip} from './Tooltip';

import {StyledApp, THEME_ID} from '../Layout';

describe('<Tooltip />', () => {
  it('renders correctly', () => {
    const tree = render(
      <StyledApp themeId={THEME_ID.LIGHT}>
        <Tooltip body={<div>Tooltip Content</div>}>Hover Me</Tooltip>
      </StyledApp>,
    );
    expect(tree).toMatchSnapshot();
  });
});
