/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {fireEvent, render, screen} from '@testing-library/react';

import {EntropyContainer} from './EntropyContainer';

import {withIntl, withTheme} from '../util/test/TestUtil';
require('jest-canvas-mock');

jest.mock('../component/EntropyCanvas', () => {
  const {EntropyData} = require('../../util/entropy');

  return {
    EntropyCanvas: ({
      ariaLabel,
      onProgress,
    }: {
      ariaLabel?: string;
      onProgress: (entropyData: InstanceType<typeof EntropyData>, percent: number, pause: boolean) => void;
    }) => (
      <button type="button" aria-label={ariaLabel} onClick={() => onProgress(new EntropyData(), 25, false)}>
        Mock entropy canvas
      </button>
    ),
  };
});

describe('EntropyContainer', () => {
  const mockonSetEntropy = jest.fn().mockImplementation();

  beforeEach(() => {
    mockonSetEntropy.mockClear();
  });

  it('renders elements', () => {
    const {getByText, queryByText} = render(withTheme(withIntl(<EntropyContainer onSetEntropy={mockonSetEntropy} />)));
    expect(getByText(/Increase your account’s security/i)).toBeTruthy();
    expect(getByText(/move your mouse/i)).toBeTruthy();
    expect(queryByText(/success/i)).toBeNull();
  });

  it('exposes accessible labels for entropy input and progress bar', () => {
    render(withTheme(withIntl(<EntropyContainer onSetEntropy={mockonSetEntropy} />)));

    expect(
      screen.getByRole('button', {
        name: /move your mouse or finger on your trackpad as randomly as possible until the process is complete\./i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole('progressbar', {name: /entropy collection progress/i})).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
  });

  it('announces progress milestones when entropy collection advances', () => {
    render(withTheme(withIntl(<EntropyContainer onSetEntropy={mockonSetEntropy} />)));

    fireEvent.click(
      screen.getByRole('button', {
        name: /move your mouse or finger on your trackpad as randomly as possible until the process is complete\./i,
      }),
    );

    expect(screen.getByRole('progressbar', {name: /entropy collection progress/i})).toHaveAttribute(
      'aria-valuenow',
      '25',
    );
    expect(screen.getByText('Entropy collection progress 25%.')).toBeInTheDocument();
  });
});
