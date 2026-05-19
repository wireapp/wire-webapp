/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {VideoBackgroundSettings} from './videoBackgroundSettings';
import type {BuiltinBackground} from 'Repositories/media/videoBackgroundEffects';
import {withTheme} from '../../../../auth/util/test/testUtil';

jest.mock('Util/localizerUtil', () => ({
  t: (key: string) => key,
}));

describe('VideoBackgroundSettings', () => {
  const defaultProps = {
    selectedEffect: {type: 'none'} as const,
    backgrounds: [] as BuiltinBackground[],
    onSelectEffect: jest.fn(),
    onEnableHighQualityBlur: jest.fn(),
    onClose: jest.fn(),
    highQualityBlurAllowed: false,
  };

  it('renders the high quality blur checkbox as disabled', async () => {
    const {getByTestId} = render(withTheme(<VideoBackgroundSettings {...defaultProps} />));
    const checkbox = getByTestId('enable-high-quality-blur') as HTMLButtonElement;

    expect(checkbox).toBeDisabled();
  });
});
