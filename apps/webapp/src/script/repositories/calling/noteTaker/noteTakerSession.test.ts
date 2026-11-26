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

import ko from 'knockout';
import {noop} from 'noop-esm';
import {task} from 'true-myth';

import {createNoteTakerSession, type NoteTakerCall, type NoteTakerAudioPlatform} from './noteTakerSession';
import type {SpeechEngine} from './speechEngine';

import {MuteState} from '../CallState';

// Audio capture must not interfere with the ongoing call's media ownership.
describe('NoteTakerSession', () => {
  let clock: ReturnType<typeof createDeterministicClock>;
  let processors: {connect: jest.Mock; disconnect: jest.Mock; onaudioprocess: ((event: unknown) => void) | null}[];
  let gains: {gain: {value: number}; connect: jest.Mock; disconnect: jest.Mock}[];
  let engine: SpeechEngine;
  let muteState: ko.Observable<MuteState>;
  let tracks: MediaStreamTrack[];
  let call: NoteTakerCall;
  let onEntry: jest.Mock;
  let onError: jest.Mock;
  let close: jest.Mock;
  let audioPlatform: NoteTakerAudioPlatform;
  const createSession = (
    options: Parameters<typeof createNoteTakerSession>[0],
  ): ReturnType<typeof createNoteTakerSession> => {
    return createNoteTakerSession({...options, audioPlatform});
  };

  const flushTranscription = async (): Promise<void> => {
    for (let turn = 0; turn < 10; turn++) {
      await Promise.resolve();
    }
  };

  const emit = (samples: Float32Array, channel = 0): void => {
    processors[channel].onaudioprocess?.({
      inputBuffer: {
        getChannelData: () => {
          return samples;
        },
      },
    });
  };

  beforeEach(() => {
    clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    gains = [];
    processors = [];
    close = jest.fn().mockResolvedValue(undefined);
    const createContext = jest.fn().mockImplementation(() => {
      return {
        sampleRate: 16000,
        currentTime: 0,
        destination: {},
        createScriptProcessor: () => {
          const processor = {connect: jest.fn(), disconnect: jest.fn(), onaudioprocess: null};
          processors.push(processor);
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
    const createStream = jest.fn().mockImplementation((audioTracks: MediaStreamTrack[]) => {
      return {
        getAudioTracks: () => {
          return audioTracks;
        },
      };
    });
    audioPlatform = {createContext, createStream};
    tracks = [{id: 'local', readyState: 'live', stop: jest.fn()} as unknown as MediaStreamTrack];
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
          clientId: 'client',
          user: {
            qualifiedId: {id: 'bob', domain: 'example.com'},
            name: () => {
              return 'Alice';
            },
            isMe: true,
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
      isMicrophoneMuted: () => {
        return muteState() !== MuteState.NOT_MUTED;
      },
      subscribeMicrophoneMute: (listener: () => void) => {
        return muteState.subscribe(listener);
      },
      getNoteTakerAudioParticipant: () => {
        return {
          clientId: 'client',
          user: {
            qualifiedId: {id: 'bob', domain: 'example.com'},
            name: () => {
              return 'Bob';
            },
          },
        };
      },
      participants: ko.observableArray([
        {
          clientId: 'client',
          user: {
            qualifiedId: {id: 'bob', domain: 'example.com'},
            name: () => {
              return 'Alice';
            },
            isMe: true,
          },
          isActivelySpeaking: () => {
            return false;
          },
        },
        {
          clientId: 'client',
          user: {
            qualifiedId: {id: 'bob', domain: 'example.com'},
            name: () => {
              return 'Bob';
            },
            isMe: false,
          },
          isActivelySpeaking: () => {
            return true;
          },
        },
      ]),
    } as unknown as NoteTakerCall;
    engine = {
      load: jest.fn(),
      transcribe: jest.fn().mockImplementation(() => {
        return task.resolve('hello');
      }),
      dispose: jest.fn(),
    };
    onEntry = jest.fn();
    onError = jest.fn();
  });

  it('flushes the last partial chunk and leaves the call tracks running', async () => {
    const session = createSession({clock, call, engine, onEntry, onError});
    await session.start();
    emit(new Float32Array(16000).fill(0.1));
    await session.stop();
    expect(onEntry).toHaveBeenCalledWith({
      seconds: 0,
      text: 'hello',
      speaker: 'You',
      speakerName: 'Alice',
    });
    expect(tracks[0].stop).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
    expect(engine.dispose).toHaveBeenCalledTimes(1);
    clock.advanceByMilliseconds(1000);
    expect(close).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('transcribes local and remote audio separately with their speaker labels', async () => {
    tracks.push({id: 'remote-1', readyState: 'live', stop: jest.fn()} as unknown as MediaStreamTrack);
    const session = createSession({clock, call, engine, onEntry, onError});
    await session.start();
    emit(new Float32Array(16000).fill(0.1), 0);
    emit(new Float32Array(16000).fill(0.2), 1);
    await session.stop();
    expect(
      onEntry.mock.calls.map(([entry]) => {
        return entry.speaker;
      }),
    ).toEqual(['You', 'remote:remote-1']);
    expect(engine.transcribe).toHaveBeenCalledTimes(2);
    expect(
      onEntry.mock.calls.map(([entry]) => {
        return entry.speakerName;
      }),
    ).toEqual(['Alice', 'Bob']);
  });

  it('keeps accurate timing when the engine transfers and detaches the audio buffer', async () => {
    const stats = jest.fn();
    engine.transcribe = jest.fn().mockImplementation((audio: Float32Array) => {
      structuredClone(audio, {transfer: [audio.buffer]});
      return task.resolve('transferred');
    });
    const session = createSession({clock, call, engine, onEntry, onError, onStats: stats});
    await session.start();
    emit(new Float32Array(16000).fill(0.1));
    await session.stop();
    expect(stats).toHaveBeenCalledWith(expect.objectContaining({audioSeconds: 1, queuedSeconds: 0}));
  });

  it('shows revisable previews before committing a final transcript', async () => {
    const preview = jest.fn();
    engine.transcribe = jest
      .fn()
      .mockReturnValueOnce(task.resolve('I scream'))
      .mockReturnValueOnce(task.resolve('Ice cream'))
      .mockReturnValueOnce(task.resolve('Ice cream is ready.'));
    const session = createSession({clock, call, engine, onEntry, onError, onPreview: preview});
    await session.start();
    emit(new Float32Array(16000).fill(0.1));
    await flushTranscription();
    expect(preview).toHaveBeenLastCalledWith({
      seconds: 0,
      text: 'I scream',
      speaker: 'You',
      speakerName: 'Alice',
    });
    expect(onEntry).not.toHaveBeenCalled();
    emit(new Float32Array(16000).fill(0.1));
    await flushTranscription();
    expect(preview).toHaveBeenLastCalledWith({
      seconds: 0,
      text: 'Ice cream',
      speaker: 'You',
      speakerName: 'Alice',
    });
    expect(onEntry).not.toHaveBeenCalled();
    await session.stop();
    expect(onEntry).toHaveBeenCalledWith({
      seconds: 0,
      text: 'Ice cream is ready.',
      speaker: 'You',
      speakerName: 'Alice',
    });
    expect(preview).toHaveBeenLastCalledWith({seconds: 0, text: '', speaker: 'You'});
  });

  it('coalesces slow previews, prioritizes final audio, and suppresses stale results', async () => {
    const preview = jest.fn();
    const finish: ((text: string) => void)[] = [];
    const sizes: number[] = [];
    engine.transcribe = jest.fn().mockImplementation((audio: Float32Array) => {
      sizes.push(audio.length);
      return task.fromPromise(
        new Promise<string>(resolve => {
          finish.push(resolve);
        }),
        error => {
          return new Error(String(error));
        },
      );
    });
    const session = createSession({clock, call, engine, onEntry, onError, onPreview: preview});
    await session.start();
    emit(new Float32Array(16000).fill(0.1));
    for (let second = 0; second < 10; second++) {
      emit(new Float32Array(16000).fill(0.1));
    }
    expect(engine.transcribe).toHaveBeenCalledTimes(1);
    finish[0]('outdated preview');
    await flushTranscription();
    expect(preview).not.toHaveBeenCalled();
    expect(sizes).toEqual([16000, 16000 * 10]);
    finish[1]('final words');
    await flushTranscription();
    expect(onEntry).toHaveBeenCalledWith({
      seconds: 0,
      text: 'final words',
      speaker: 'You',
      speakerName: 'Alice',
    });
    expect(engine.transcribe).toHaveBeenCalledTimes(3);
    session.cancel();
    finish[2]('cancelled preview');
    await flushTranscription();
    expect(preview).not.toHaveBeenCalledWith(expect.objectContaining({text: 'cancelled preview'}));
  });

  it('uses the AVS track identity at capture time when a receiver switches sender', async () => {
    tracks.push({id: 'receiver', readyState: 'live', stop: jest.fn()} as unknown as MediaStreamTrack);
    let name = 'Bob';
    call.getNoteTakerAudioParticipant = jest.fn().mockImplementation(() => {
      return {
        clientId: 'client',
        user: {
          qualifiedId: {id: name, domain: 'example.com'},
          name: () => {
            return name;
          },
        },
      };
    });
    const session = createSession({clock, call, engine, onEntry, onError});
    await session.start();
    emit(new Float32Array(16000).fill(0.1), 1);
    name = 'Carol';
    emit(new Float32Array(16000).fill(0.1), 1);
    await session.stop();
    expect(
      onEntry.mock.calls.map(([entry]) => {
        return entry.speakerName;
      }),
    ).toEqual(['Bob', 'Carol']);
  });

  it.each(['Same display name', 'Remote participant'])(
    'splits reused receivers by identity when both participants are named %s',
    async name => {
      tracks.push({id: 'receiver', readyState: 'live', stop: jest.fn()} as unknown as MediaStreamTrack);
      let userId = 'first';
      call.getNoteTakerAudioParticipant = jest.fn().mockImplementation(() => {
        return {
          clientId: 'client',
          user: {
            qualifiedId: {id: userId, domain: 'example.com'},
            name: () => {
              return name;
            },
          },
        };
      });
      const session = createSession({clock, call, engine, onEntry, onError});
      const started = await session.start();
      expect(started.isOk).toBe(true);
      emit(new Float32Array(16000).fill(0.1), 1);
      userId = 'second';
      emit(new Float32Array(16000).fill(0.2), 1);
      await session.stop();
      expect(onError).not.toHaveBeenCalled();
      expect(engine.transcribe).toHaveBeenCalledTimes(2);
      expect(
        (engine.transcribe as jest.Mock).mock.calls.map(([audio]: [Float32Array]) => {
          return audio.length;
        }),
      ).toEqual([16000, 16000]);
      expect(
        onEntry.mock.calls.map(([entry]) => {
          return [entry.speakerName, entry.seconds];
        }),
      ).toEqual([
        [name, 0],
        [name, 1],
      ]);
    },
  );

  it('remembers resolved identity even when its name equals the unresolved label', async () => {
    tracks.push({id: 'receiver', readyState: 'live', stop: jest.fn()} as unknown as MediaStreamTrack);
    let identity = '';
    call.getNoteTakerAudioParticipant = jest.fn().mockImplementation(() => {
      if (identity.length === 0) {
        return undefined;
      }
      return {
        clientId: 'client',
        user: {
          qualifiedId: {id: identity, domain: 'example.com'},
          name: () => {
            return identity === 'first' ? 'Remote participant' : 'Bob';
          },
        },
      };
    });
    const session = createSession({clock, call, engine, onEntry, onError});
    await session.start();
    emit(new Float32Array(8000).fill(0.1), 1);
    identity = 'first';
    emit(new Float32Array(8000).fill(0.1), 1);
    identity = 'second';
    emit(new Float32Array(16000).fill(0.2), 1);
    await session.stop();
    expect(onError).not.toHaveBeenCalled();
    expect(engine.transcribe).toHaveBeenCalledTimes(2);
    expect(
      onEntry.mock.calls.map(([entry]) => {
        return [entry.speakerName, entry.seconds];
      }),
    ).toEqual([
      ['Remote participant', 0],
      ['Bob', 1],
    ]);
  });

  it('immediately excludes a muted microphone while retaining remote audio', async () => {
    tracks.push({readyState: 'live', stop: jest.fn()} as unknown as MediaStreamTrack);
    const session = createSession({clock, call, engine, onEntry, onError});
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
      return task.fromPromise(
        new Promise<string>(resolve => {
          finish = resolve;
        }),
        error => {
          return new Error(String(error));
        },
      );
    });
    const session = createSession({clock, call, engine, onEntry, onError});
    await session.start();
    emit(new Float32Array(16000 * 10).fill(0.1));
    const stopped = session.stop();
    expect(session.stop()).toBe(stopped);
    expect(engine.dispose).not.toHaveBeenCalled();
    finish('last words');
    await stopped;
    expect(onEntry).toHaveBeenCalledWith({
      seconds: 0,
      text: 'last words',
      speaker: 'You',
      speakerName: 'Alice',
    });
    expect(engine.dispose).toHaveBeenCalledTimes(1);
  });

  it('skips silence and reconnects replacement tracks without stopping the old track', async () => {
    const session = createSession({clock, call, engine, onEntry, onError});
    await session.start();
    emit(new Float32Array(16000 * 8));
    const previousTrack = tracks[0];
    tracks = [{id: 'local', readyState: 'live', stop: jest.fn()} as unknown as MediaStreamTrack];
    clock.advanceByMilliseconds(500);
    expect(gains[0].disconnect).toHaveBeenCalled();
    expect(gains).toHaveLength(2);
    expect(previousTrack.stop).not.toHaveBeenCalled();
    await session.stop();
    expect(engine.transcribe).not.toHaveBeenCalled();
  });
});
