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

import {noop} from 'noop-esm';

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';

import {NoteTaker} from './noteTaker';
import {NoteTakerSession} from './noteTakerSession';
import {WhisperWorkerEngine} from './speechEngine';

import type {Call} from '../../../repositories/calling/Call';

const mockLoad = jest.fn();
const mockDispose = jest.fn();
const mockStartCapture = jest.fn();
const mockStopCapture = jest.fn();

// Workers and Web Audio are unavailable in jsdom; exercise capture separately in the session suite.
// eslint-disable-next-line jest/no-restricted-jest-methods
jest.mock('./speechEngine', () => {
  return {WhisperWorkerEngine: jest.fn()};
});
// eslint-disable-next-line jest/no-restricted-jest-methods
jest.mock('./noteTakerSession', () => {
  return {NoteTakerSession: jest.fn()};
});

describe('experimental note taker opt-in', () => {
  const call = {} as Call;

  beforeEach(() => {
    jest.clearAllMocks();
    (WhisperWorkerEngine as jest.Mock).mockImplementation(() => {
      return {load: mockLoad, dispose: mockDispose};
    });
    (NoteTakerSession as jest.Mock).mockImplementation(() => {
      return {start: mockStartCapture, stop: mockStopCapture};
    });
    mockLoad.mockResolvedValue(undefined);
    mockStartCapture.mockResolvedValue(undefined);
    mockStopCapture.mockResolvedValue(undefined);
  });

  const expand = (): void => {
    fireEvent.click(screen.getByRole('button', {name: /Note taker \(experiment\)/}));
  };

  it('loads neither the engine nor its model until Enable is clicked', async () => {
    render(<NoteTaker call={call} />);
    expect(WhisperWorkerEngine).not.toHaveBeenCalled();
    expand();
    expect(WhisperWorkerEngine).not.toHaveBeenCalled();
    expect(mockLoad).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Enable note taker'}));
    await waitFor(() => {
      return expect(mockStartCapture).toHaveBeenCalledTimes(1);
    });
    expect(mockLoad).toHaveBeenCalledWith('Xenova/whisper-tiny', expect.any(Function));
    expect(screen.getByRole('status')).toHaveTextContent('Transcribing locally');
  });

  it('cancels loading and cannot start capture after Stop was clicked', async () => {
    let finishLoading: () => void = noop;
    mockLoad.mockImplementation(() => {
      return new Promise<void>(resolve => {
        finishLoading = resolve;
      });
    });
    render(<NoteTaker call={call} />);
    expand();
    fireEvent.click(screen.getByRole('button', {name: 'Enable note taker'}));
    fireEvent.click(screen.getByRole('button', {name: 'Stop note taker'}));
    expect(mockDispose).toHaveBeenCalledTimes(1);
    await act(async () => {
      finishLoading();
    });
    expect(NoteTakerSession).not.toHaveBeenCalled();
    expect(screen.getByRole('button', {name: 'Enable note taker'})).toBeEnabled();
  });
});
