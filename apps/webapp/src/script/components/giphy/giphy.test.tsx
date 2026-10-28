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

import {GiphyRepository} from 'Repositories/extension/GiphyRepository';
import {withTheme} from 'src/script/auth/util/test/testUtil';
import {translateForTest} from 'Util/test/translateForTest';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {Giphy, GiphyState} from '.';

const inputValue = 'Yammy yammy';
type GetDefaultPropsResult = {giphyRepository: GiphyRepository; inputValue: string; onClose: jest.Mock<any, any, any>};
const getDefaultProps = (): GetDefaultPropsResult => {
  return {
    giphyRepository: {getGifs: jest.fn().mockResolvedValue([]), resetOffset: jest.fn()} as unknown as GiphyRepository,
    inputValue,
    onClose: jest.fn(),
  };
};

const closeButtonId = 'do-close-giphy-modal';
const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

describe('Giphy', () => {
  it('rendered modal', async () => {
    const {getByText, getByTestId} = render(
      withTheme(<Giphy {...getDefaultProps()} defaultGiphyState={GiphyState.RESULT} />),
      {wrapper: rootProviderWrapper},
    );
    await waitFor(() => {
      return getByTestId(closeButtonId);
    });
    expect(getByText(inputValue)).not.toBeNull();
  });

  it('closes giphy modal', async () => {
    const {getByTestId} = render(withTheme(<Giphy {...getDefaultProps()} />), {wrapper: rootProviderWrapper});
    await waitFor(() => {
      return getByTestId(closeButtonId);
    });
    const closeButton = getByTestId(closeButtonId);

    expect(closeButton).not.toBeNull();
    fireEvent.click(closeButton);
  });

  it('shows a message and disables GIF actions when a search returns no results', async () => {
    const props = {...getDefaultProps(), inputValue: 'int aa'};
    const {findByText, getByRole} = render(withTheme(<Giphy {...props} />), {wrapper: rootProviderWrapper});

    expect(await findByText('extensionsGiphyNoGifs')).toBeVisible();
    expect(props.giphyRepository.getGifs).toHaveBeenCalledWith('int aa');
    expect(getByRole('button', {name: 'accessibility.giphyModal.tryAnother'})).toBeDisabled();
    expect(getByRole('button', {name: 'accessibility.giphyModal.sendGif'})).toBeDisabled();
    expect(getByRole('button', {name: 'accessibility.giphyModal.close'})).toBeEnabled();
  });

  it('shows a message in the error state', async () => {
    const {getByText, getByTestId} = render(
      withTheme(<Giphy {...getDefaultProps()} defaultGiphyState={GiphyState.ERROR} />),
      {wrapper: rootProviderWrapper},
    );

    await waitFor(() => {
      return getByTestId(closeButtonId);
    });
    expect(getByText('extensionsGiphyNoGifs')).not.toBeNull();
  });
});
