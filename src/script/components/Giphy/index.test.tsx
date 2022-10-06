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

import {fireEvent, render} from '@testing-library/react';

import Giphy, {GiphyState} from './index';

import {GiphyRepository} from '../../extension/GiphyRepository';
import {GiphyService} from '../../extension/GiphyService';

const inputValue = 'Yammy yammy';
const getDefaultProps = () => ({
  giphyRepository: new GiphyRepository(new GiphyService()),
  inputValue,
  onClose: jest.fn(),
});

describe('Giphy', () => {
  it('rendered modal', () => {
    const {getByText} = render(<Giphy {...getDefaultProps()} defaultGiphyState={GiphyState.RESULT} />);
    expect(getByText(inputValue)).not.toBeNull();
  });

  it('closes giphy modal', async () => {
    const {getByTestId} = render(<Giphy {...getDefaultProps()} />);
    const closeButton = getByTestId('do-close-giphy-modal');

    expect(closeButton).not.toBeNull();
    fireEvent.click(closeButton);
  });

  it('no giphys found', async () => {
    const {getByText} = render(<Giphy {...getDefaultProps()} defaultGiphyState={GiphyState.ERROR} />);

    expect(getByText('extensionsGiphyNoGifs')).not.toBeNull();
  });
});
