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

import {fireEvent, render} from '@testing-library/react';

import {PanelHeader} from './PanelHeader';

const goBackUie = 'back-button';
const closeUie = 'do-close';

describe('PanelHeader', () => {
  it('calls the correct callbacks for back and close', () => {
    const props = {
      onClose: jest.fn(),
      onGoBack: jest.fn(),
    };

    const {getByTestId} = render(<PanelHeader {...props} />);

    const backButton = getByTestId(goBackUie);
    fireEvent.click(backButton);
    expect(props.onGoBack).toHaveBeenCalled();

    const closeButton = getByTestId(closeUie);
    fireEvent.click(closeButton);
    expect(props.onClose).toHaveBeenCalled();
  });
});
