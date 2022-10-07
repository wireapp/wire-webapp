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

import LoadingBar from './LoadingBar';
import {render} from '@testing-library/react';

describe('LoadingBar', () => {
  it('renders correct progress', async () => {
    const props = {message: 'example', progress: 30};

    const {getByTestId} = render(<LoadingBar {...props} />);
    expect(getByTestId('loading-bar-progress').getAttribute('style')).toBe('width: 30%;');
  });
});
