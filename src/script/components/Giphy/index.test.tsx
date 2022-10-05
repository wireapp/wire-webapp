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

import {fireEvent, render, waitFor} from '@testing-library/react';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';

import {GiphyRepository} from '../../extension/GiphyRepository';
import {GiphyService} from '../../extension/GiphyService';

import Giphy, {GiphyState} from './index';

const getDefaultProps = () => ({
  giphyRepository: new GiphyRepository(new GiphyService()),
});

describe('Giphy', () => {
  it('subscribes to GIPHY.SHOW on mount', async () => {
    spyOn(amplify, 'subscribe').and.returnValue(undefined);

    await render(<Giphy {...getDefaultProps()} />);
    await waitFor(() => {
      expect(amplify.subscribe).toHaveBeenCalledWith(WebAppEvents.EXTENSIONS.GIPHY.SHOW, expect.anything());
    });
  });

  it('closes giphy modal', async () => {
    const {container} = render(<Giphy {...getDefaultProps()} />);
    const closeButton = container.querySelector('button[data-uie-name="do-close-giphy-modal"]');

    expect(closeButton).not.toBeNull();
    fireEvent.click(closeButton!);
  });

  it('no giphys found', async () => {
    const {container} = render(<Giphy {...getDefaultProps()} defaultGiphyState={GiphyState.ERROR} />);
    const errorContainer = container.querySelector('[data-uie-name="giphy-error-message"]');

    expect(errorContainer).not.toBeNull();
    expect(errorContainer!.innerHTML).toEqual('extensionsGiphyNoGifs');
  });
});
