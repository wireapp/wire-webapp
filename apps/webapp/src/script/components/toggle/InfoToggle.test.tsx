/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {render, fireEvent} from '@testing-library/react';

import {withTheme} from 'src/script/auth/util/test/testUtil';

import {InfoToggle} from './InfoToggle';

describe('InfoToggle', () => {
  it('toggles check property', () => {
    const dataUieName = 'example';
    let isChecked = false;
    const props = {
      dataUieName,
      info: 'info',
      isChecked,
      isDisabled: false,
      name: 'example',
      setIsChecked: (updatedIsChecked: boolean) => {
        isChecked = updatedIsChecked;
      },
    };

    const {getByText, getByTestId} = render(<InfoToggle {...props} />);

    expect(getByText('info')).not.toBeNull();

    const input = getByTestId('info-toggle-input');
    fireEvent.click(input);

    expect(isChecked).toBe(true);
  });

  it('renders Shared Drive admin hint only when provided', () => {
    const props = {
      dataUieName: 'example',
      info: 'info',
      isChecked: false,
      isDisabled: false,
      name: 'example',
      setIsChecked: jest.fn(),
    };

    const {queryByText, rerender} = render(withTheme(<InfoToggle {...props} />));

    expect(queryByText('People outside your team can view files, not upload or edit.')).toBeNull();

    rerender(
      withTheme(
        <InfoToggle {...props} adminHintForShareDrive="People outside your team can view files, not upload or edit." />,
      ),
    );

    expect(queryByText('People outside your team can view files, not upload or edit.')).not.toBeNull();
  });
});
