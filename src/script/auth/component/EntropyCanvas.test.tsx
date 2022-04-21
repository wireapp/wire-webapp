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

import {fireEvent, render, screen, act} from '@testing-library/react';
import React from 'react';
import {withIntl, withTheme} from '../util/test/TestUtil';
import EntropyCanvas from './EntropyCanvas';
require('jest-canvas-mock');

describe('EntropyCanvas', () => {
  const mockonSetEntropy = jest.fn().mockImplementation(() => {});

  afterEach(() => {
    jest.clearAllMocks();
  });

  const setStateMock = jest.fn();
  const useStateMock: any = (useState: any) => [useState, setStateMock];
  jest.spyOn(React, 'useState').mockImplementation(useStateMock);

  const setErrorMock = jest.fn();
  const useErrorMock: any = (useState: any) => [useState, setErrorMock];
  jest.spyOn(React, 'useState').mockImplementation(useErrorMock);

  const [, setEntropy] = useStateMock([]);
  const [, setError] = useErrorMock(null);

  const mockOnProgress = jest.fn((entropyData: [number, number][], percent: number, pause: boolean) => {
    setEntropy(entropyData);
    setError(pause);
  });

  it('reacts to drawing', async () => {
    render(
      withTheme(
        withIntl(<EntropyCanvas onSetEntropy={mockonSetEntropy} onProgress={mockOnProgress} sizeX={256} sizeY={256} />),
      ),
    );
    const canvas = screen.getByTestId('element-entropy-canvas');
    await act(async () => {
      fireEvent.mouseEnter(canvas);
      fireEvent.mouseMove(canvas);
      fireEvent.mouseLeave(canvas);
    });
    expect(setEntropy).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalledTimes(5);
  });

  it('starts drawing again after leaving canvas', async () => {
    render(
      withTheme(
        withIntl(<EntropyCanvas onSetEntropy={mockonSetEntropy} onProgress={mockOnProgress} sizeX={256} sizeY={256} />),
      ),
    );
    const canvas = screen.getByTestId('element-entropy-canvas');
    await act(async () => {
      fireEvent.mouseEnter(canvas);
      fireEvent.mouseMove(canvas);
      fireEvent.mouseLeave(canvas);
      fireEvent.mouseEnter(canvas);
      fireEvent.mouseMove(canvas);
      fireEvent.mouseLeave(canvas);
    });
    expect(setEntropy).toHaveBeenCalledTimes(2);
    expect(setError).toHaveBeenCalledTimes(10);
  });
});
