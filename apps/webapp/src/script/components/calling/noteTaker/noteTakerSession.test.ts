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

import ko from 'knockout';
import {noop} from 'noop-esm';

import {NoteTakerSession} from './noteTakerSession';
import type {SpeechEngine} from './speechEngine';

import type {Call} from '../../../repositories/calling/Call';
import {MuteState} from '../../../repositories/calling/CallState';

// Audio capture must not interfere with the ongoing call's media ownership.
describe('NoteTakerSession', () => {
  let processor: {connect: jest.Mock; disconnect: jest.Mock; onaudioprocess: ((event: unknown) => void) | null};
  let gains: {gain: {value: number}; connect: jest.Mock; disconnect: jest.Mock}[];
  let engine: SpeechEngine;
  let muteState: ko.Observable<MuteState>;
  let tracks: MediaStreamTrack[];
  let call: Call;
  let onEntry: jest.Mock;
  let onError: jest.Mock;
  let close: jest.Mock;
  const originalAudioContext = global.AudioContext;
  const originalMediaStream = global.MediaStream;

  const emit = (samples: Float32Array): void => {
    processor.onaudioprocess?.({
      inputBuffer: {
        getChannelData: () => {
          return samples;
        },
      },
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    gains = [];
    processor = {connect: jest.fn(), disconnect: jest.fn(), onaudioprocess: null};
    close = jest.fn().mockResolvedValue(undefined);
    global.AudioContext = jest.fn().mockImplementation(() => {
      return {
        sampleRate: 16000,
        destination: {},
        createScriptProcessor: () => {
          return processor;
        },
        createMediaStreamSource: () => {
          return {connect: jest.fn(), disconnect: jest.fn()};
        },
        createGain: () => {
          const gain = {gain: {value: 1}, connect: jest.fn(), disconnect: jest.fn()};
          gains.push(gain);
          return gain;
        },
        resume: jest.fn().mockResolvedValue(undefined),
        close,
      };
    });
    global.MediaStream = jest.fn().mockImplementation((audioTracks: MediaStreamTrack[]) => {
      return {
        getAudioTracks: () => {
          return audioTracks;
        },
      };
    });
    tracks = [{readyState: 'live', stop: jest.fn()} as unknown as MediaStreamTrack];
    const local = {
      getAudioTracks: () => {
        return [tracks[0]];
      },
    };
    muteState = ko.observable(MuteState.NOT_MUTED);
    call = {
      getSelfParticipant: () => {
        return {
          audioStream: () => {
            return local;
          },
        };
      },
      getNoteTakerAudioStreams: () => {
        return [
          {
            getAudioTracks: () => {
              return tracks;
            },
          },
        ];
      },
      muteState,
    } as unknown as Call;
    engine = {load: jest.fn(), transcribe: jest.fn().mockResolvedValue('hello'), dispose: jest.fn()};
    onEntry = jest.fn();
    onError = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.AudioContext = originalAudioContext;
    global.MediaStream = originalMediaStream;
  });

  it('flushes the last partial chunk and leaves the call tracks running', async () => {
    const session = new NoteTakerSession(call, engine, onEntry, onError);
    await session.start();
    emit(new Float32Array(16000).fill(0.1));
    await session.stop();
    expect(onEntry).toHaveBeenCalledWith({seconds: 0, text: 'hello'});
    expect(tracks[0].stop).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
    expect(engine.dispose).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    expect(onError).not.toHaveBeenCalled();
  });

  it('immediately excludes a muted microphone while retaining remote audio', async () => {
    tracks.push({readyState: 'live', stop: jest.fn()} as unknown as MediaStreamTrack);
    const session = new NoteTakerSession(call, engine, onEntry, onError);
    await session.start();
    muteState(MuteState.SELF_MUTED);
    expect(
      gains.map(gain => {
        return gain.gain.value;
      }),
    ).toEqual([0, 1]);
    muteState(MuteState.NOT_MUTED);
    expect(
      gains.map(gain => {
        return gain.gain.value;
      }),
    ).toEqual([1, 1]);
    await session.stop();
  });

  it('drains in-flight audio before disposing, and stopping twice is harmless', async () => {
    let finish: (text: string) => void = noop;
    engine.transcribe = jest.fn().mockImplementation(() => {
      return new Promise<string>(resolve => {
        finish = resolve;
      });
    });
    const session = new NoteTakerSession(call, engine, onEntry, onError);
    await session.start();
    emit(new Float32Array(16000 * 8).fill(0.1));
    const stopped = session.stop();
    expect(session.stop()).toBe(stopped);
    expect(engine.dispose).not.toHaveBeenCalled();
    finish('last words');
    await stopped;
    expect(onEntry).toHaveBeenCalledWith({seconds: 0, text: 'last words'});
    expect(engine.dispose).toHaveBeenCalledTimes(1);
  });

  it('skips silence and reconnects replacement tracks without stopping the old track', async () => {
    const session = new NoteTakerSession(call, engine, onEntry, onError);
    await session.start();
    emit(new Float32Array(16000 * 8));
    const previousTrack = tracks[0];
    tracks = [{readyState: 'live', stop: jest.fn()} as unknown as MediaStreamTrack];
    jest.advanceTimersByTime(500);
    expect(gains[0].disconnect).toHaveBeenCalled();
    expect(gains).toHaveLength(2);
    expect(previousTrack.stop).not.toHaveBeenCalled();
    await session.stop();
    expect(engine.transcribe).not.toHaveBeenCalled();
  });
});
