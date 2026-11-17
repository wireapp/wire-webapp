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

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';

import {noop} from 'noop-esm';
import {task} from 'true-myth';

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';

import {NoteTaker} from './noteTaker';
import {useNoteTakerPanelStore} from './useNoteTakerPanelStore';
import type {NoteTakerCall, createNoteTakerSession} from './noteTakerSession';
import type {SpeechEngine} from './speechEngine';

const mockLoad = jest.fn();
const mockDispose = jest.fn();
const mockStartCapture = jest.fn();
const mockStopCapture = jest.fn();

const createEngine = jest.fn<SpeechEngine, []>();
const createSession = jest.fn<ReturnType<typeof createNoteTakerSession>, Parameters<typeof createNoteTakerSession>>();
const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
const dependencies = {clock, createEngine, createSession};

describe('experimental note taker opt-in', () => {
  const call = {} as NoteTakerCall;

  beforeEach(() => {
    jest.clearAllMocks();
    useNoteTakerPanelStore.setState({isOpen: false, isRecording: false, panelTarget: null});
    createEngine.mockImplementation(() => {
      return {load: mockLoad, transcribe: jest.fn(), dispose: mockDispose};
    });
    createSession.mockImplementation(() => {
      return {start: mockStartCapture, stop: mockStopCapture, cancel: jest.fn()};
    });
    mockLoad.mockImplementation(() => {
      return task.resolve(undefined);
    });
    mockStartCapture.mockImplementation(() => {
      return task.resolve(undefined);
    });
    mockStopCapture.mockResolvedValue(undefined);
  });

  const expand = (): void => {
    act(() => {
      useNoteTakerPanelStore.getState().setOpen(true);
    });
  };

  it('loads neither the engine nor its model until Enable is clicked', async () => {
    render(<NoteTaker {...dependencies} call={call} />);
    expect(createEngine).not.toHaveBeenCalled();
    expand();
    expect(createEngine).not.toHaveBeenCalled();
    expect(mockLoad).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Enable note taker'}));
    await waitFor(() => {
      return expect(mockStartCapture).toHaveBeenCalledTimes(1);
    });
    expect(mockLoad).toHaveBeenCalledWith('onnx-community/whisper-base', expect.any(Function), {
      device: 'auto',
      language: 'en',
    });
    expect(screen.getByRole('status')).toHaveTextContent('Transcribing locally');
  });

  it('retains the transcript and finishes capture when the call ends', async () => {
    const {rerender} = render(<NoteTaker {...dependencies} call={call} />);
    expand();
    fireEvent.click(screen.getByRole('button', {name: 'Enable note taker'}));
    await waitFor(() => {
      expect(mockStartCapture).toHaveBeenCalledTimes(1);
    });
    act(() => {
      createSession.mock.calls[0][3]({seconds: 0, speaker: 'You', text: 'Keep these notes.'});
    });
    rerender(<NoteTaker {...dependencies} />);
    await waitFor(() => {
      expect(mockStopCapture).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText(/Keep these notes/)).toBeVisible();
    expect(screen.getByRole('button', {name: 'Export Markdown'})).toBeEnabled();
  });

  it('passes selected acceleration, language, and model without downloading before Enable', async () => {
    render(<NoteTaker {...dependencies} call={call} />);
    expand();
    fireEvent.change(screen.getByLabelText('Acceleration'), {target: {value: 'webgpu'}});
    fireEvent.change(screen.getByLabelText('Language'), {target: {value: 'de'}});
    fireEvent.change(screen.getByLabelText('Model preset'), {target: {value: 'small'}});
    expect(mockLoad).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Enable note taker'}));
    await waitFor(() => {
      expect(mockStartCapture).toHaveBeenCalledTimes(1);
    });
    expect(mockLoad).toHaveBeenCalledWith('onnx-community/whisper-small', expect.any(Function), {
      device: 'webgpu',
      language: 'de',
    });
  });

  it.each([
    ['medium', 'onnx-community/whisper-medium-ONNX'],
    ['large-v3', 'onnx-community/whisper-large-v3-ONNX'],
  ])('loads the published repository for the %s preset', async (preset, repository) => {
    render(<NoteTaker {...dependencies} call={call} />);
    expand();
    fireEvent.change(screen.getByLabelText('Model preset'), {target: {value: preset}});
    expect(screen.getByLabelText('Whisper ONNX model')).toHaveValue(repository);
    expect(mockLoad).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Enable note taker'}));
    await waitFor(() => {
      expect(mockStartCapture).toHaveBeenCalledTimes(1);
    });
    expect(mockLoad).toHaveBeenCalledWith(repository, expect.any(Function), {device: 'auto', language: 'en'});
  });

  it('revises live words in place and replaces them with the finalized transcript', async () => {
    render(<NoteTaker {...dependencies} call={call} />);
    expand();
    fireEvent.click(screen.getByRole('button', {name: 'Enable note taker'}));
    await waitFor(() => {
      expect(mockStartCapture).toHaveBeenCalledTimes(1);
    });
    const args = createSession.mock.calls[0];
    act(() => {
      args[6]?.({seconds: 0, text: 'I scream', speaker: 'You', speakerName: 'Alice'});
    });
    expect(screen.getByLabelText('Live transcript preview')).toHaveTextContent('Alice (you)');
    expect(screen.getByLabelText('Live transcript preview')).toHaveTextContent('I scream');
    expect(screen.getByRole('button', {name: 'Export Markdown'})).toBeDisabled();
    act(() => {
      args[6]?.({seconds: 0, text: 'Ice cream', speaker: 'You'});
    });
    expect(screen.queryByText(/I scream/)).not.toBeInTheDocument();
    act(() => {
      args[3]({seconds: 0, text: 'Ice cream is ready.', speaker: 'You'});
      args[6]?.({seconds: 0, text: '', speaker: 'You'});
    });
    expect(screen.getByLabelText('Live transcript preview')).toBeEmptyDOMElement();
    expect(screen.getByText(/Ice cream is ready/)).toBeVisible();
    expect(screen.getByRole('button', {name: 'Export Markdown'})).toBeEnabled();
  });

  it('follows live text unless the reader scrolls up, and resumes at the bottom', async () => {
    render(<NoteTaker {...dependencies} call={call} />);
    expand();
    fireEvent.click(screen.getByRole('button', {name: 'Enable note taker'}));
    await waitFor(() => {
      expect(mockStartCapture).toHaveBeenCalledTimes(1);
    });
    const container = screen.getByLabelText('Live transcript preview').parentElement;
    if (!container) {
      throw new Error('Transcript container missing');
    }
    Object.defineProperties(container, {scrollHeight: {value: 500}, clientHeight: {value: 100}});
    const preview = createSession.mock.calls[0][6];
    act(() => {
      preview?.({seconds: 0, speaker: 'You', text: 'First words'});
    });
    expect(container.scrollTop).toBe(500);
    fireEvent.scroll(container, {target: {scrollTop: 10}});
    act(() => {
      preview?.({seconds: 0, speaker: 'You', text: 'More words'});
    });
    expect(container.scrollTop).toBe(10);
    fireEvent.scroll(container, {target: {scrollTop: 400}});
    act(() => {
      preview?.({seconds: 0, speaker: 'You', text: 'Latest words'});
    });
    expect(container.scrollTop).toBe(500);
  });

  it('keeps recording and retains incoming text while the panel is closed', async () => {
    render(<NoteTaker {...dependencies} call={call} />);
    expand();
    fireEvent.click(screen.getByRole('button', {name: 'Enable note taker'}));
    await waitFor(() => {
      expect(mockStartCapture).toHaveBeenCalledTimes(1);
    });
    fireEvent.click(screen.getByRole('button', {name: 'Close call notes'}));
    expect(screen.queryByRole('complementary', {name: 'Call notes'})).not.toBeInTheDocument();
    expect(mockStopCapture).not.toHaveBeenCalled();
    expect(useNoteTakerPanelStore.getState().isRecording).toBe(true);
    act(() => {
      createSession.mock.calls[0][3]({
        seconds: 1,
        speaker: 'You',
        speakerName: 'Alice',
        text: 'Captured while hidden.',
      });
    });
    expand();
    expect(screen.getByText('Captured while hidden.')).toBeVisible();
    expect(mockStartCapture).toHaveBeenCalledTimes(1);
    expect(mockStopCapture).not.toHaveBeenCalled();
  });

  it('cancels loading and cannot start capture after Stop was clicked', async () => {
    let finishLoading: () => void = noop;
    mockLoad.mockImplementation(() => {
      return task.fromPromise(
        new Promise<void>(resolve => {
          finishLoading = resolve;
        }),
        error => {
          return new Error(String(error));
        },
      );
    });
    render(<NoteTaker {...dependencies} call={call} />);
    expand();
    fireEvent.click(screen.getByRole('button', {name: 'Enable note taker'}));
    fireEvent.click(screen.getByRole('button', {name: 'Stop note taker'}));
    expect(mockDispose).toHaveBeenCalledTimes(1);
    await act(async () => {
      finishLoading();
    });
    expect(createSession).not.toHaveBeenCalled();
    expect(screen.getByRole('button', {name: 'Enable note taker'})).toBeEnabled();
  });
});
