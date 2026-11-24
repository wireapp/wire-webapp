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

import type {PipelineOptions, PipelineStats, ReadyInfo} from 'longpipe';

import {LongpipeBackgroundSession, type LongpipePipeline, type PipelineFactory} from './longpipeBackgroundEffects';

const stats: PipelineStats = {
  fps: 30,
  inputFps: 30,
  modelFps: 30,
  modelMs: 1,
  displayMs: 1,
  skipped: 0,
  preset: 'medium',
  skipFrames: 0,
  enabled: true,
  inputPath: 'mstp',
  outputPath: 'mstg',
  backend: 'webgpu',
  latencyMs: 4,
  status: 'running',
  restarts: 0,
};

describe('LongpipeBackgroundSession', () => {
  const NativeMediaStream = window.MediaStream;
  const tracks: MediaStreamTrack[] = [];
  const createTrack = (): MediaStreamTrack => {
    let stopped = false;
    const track = {
      kind: 'video',
      get readyState() {
        return stopped ? 'ended' : 'live';
      },
      stop: jest.fn(() => {
        stopped = true;
      }),
      getSettings: () => {
        return {width: 1920, height: 1080, frameRate: 30};
      },
      getConstraints: () => {
        return {};
      },
      applyConstraints: jest.fn().mockResolvedValue(undefined),
      clone: createTrack,
    } as unknown as MediaStreamTrack;
    tracks.push(track);
    return track;
  };
  let pipelines: LongpipePipeline[];
  let createPipeline: jest.MockedFunction<PipelineFactory>;
  let session: LongpipeBackgroundSession;
  let currentStats: PipelineStats;
  const onStats = jest.fn();

  beforeEach(() => {
    window.MediaStream = class {
      private tracks: MediaStreamTrack[];
      constructor(tracks: MediaStreamTrack[] = []) {
        this.tracks = [...tracks];
      }
      getTracks(): MediaStreamTrack[] {
        return [...this.tracks];
      }
      getVideoTracks(): MediaStreamTrack[] {
        return this.getTracks();
      }
      addTrack(track: MediaStreamTrack): void {
        this.tracks.push(track);
      }
      removeTrack(track: MediaStreamTrack): void {
        this.tracks = this.tracks.filter(value => {
          return value !== track;
        });
      }
    } as unknown as typeof window.MediaStream;
    jest.useFakeTimers();
    currentStats = {...stats};
    pipelines = [];
    onStats.mockClear();
    createPipeline = jest.fn<ReturnType<PipelineFactory>, Parameters<PipelineFactory>>(() => {
      const pipeline: LongpipePipeline = {
        ready: Promise.resolve({backend: 'webgpu', preset: 'medium', dtype: 'f16'}),
        stream: new MediaStream([createTrack()]),
        setBackground: jest.fn().mockResolvedValue(undefined),
        getStats: jest.fn(async () => {
          return currentStats;
        }),
        destroy: jest.fn(),
      };
      pipelines.push(pipeline);
      return pipeline;
    });
    session = new LongpipeBackgroundSession(
      createTrack(),
      {background: {blur: {strength: 'low'}}, quality: 'auto', onStats},
      createPipeline,
    );
  });
  afterEach(() => {
    session.release();
    tracks.splice(0).forEach(track => {
      track.stop();
    });
    jest.useRealTimers();
    window.MediaStream = NativeMediaStream;
  });

  it('enables Longpipe autotune and adaptive presets and forwards getStats', async () => {
    await session.start();
    expect(createPipeline).toHaveBeenCalledWith(
      expect.any(MediaStream),
      expect.objectContaining({
        preset: 'auto',
        weightsBaseUrl: '/assets/longpipe/models/v0.0.5',
        adaptive: true,
        audio: 'drop',
        background: {blur: {strength: 'low'}},
        outputResolution: {w: 1920, h: 1080},
      }),
    );
    await jest.advanceTimersByTimeAsync(1000);
    expect(onStats).toHaveBeenCalledWith(
      stats,
      {
        input: {width: 1920, height: 1080},
        output: {width: 1920, height: 1080},
        requestedOutput: {width: 1920, height: 1080},
      },
      {requestedInputFps: null, inputTrackFps: 30, countedInputFps: null, inputFpsSource: 'track-settings'},
    );
  });

  it('keeps unreported output dimensions separate from the requested output size', async () => {
    await session.start();
    jest.spyOn(session.stream.getVideoTracks()[0], 'getSettings').mockReturnValue({});
    await jest.advanceTimersByTimeAsync(1000);
    expect(onStats).toHaveBeenCalledWith(
      stats,
      {
        input: {width: 1920, height: 1080},
        output: null,
        requestedOutput: {width: 1920, height: 1080},
      },
      expect.objectContaining({inputFpsSource: 'track-settings'}),
    );
  });

  it('distinguishes a 15 FPS capture request from a 30 FPS track setting and counts delivered frames', async () => {
    await session.start();
    const input = createPipeline.mock.calls[0][0].getVideoTracks()[0];
    let frames = 0;
    Object.defineProperty(input, 'stats', {
      get: () => {
        return {totalFrames: frames};
      },
    });
    jest.spyOn(input, 'getConstraints').mockReturnValue({frameRate: {ideal: 15}});
    await jest.advanceTimersByTimeAsync(1000);
    frames = 15;
    await jest.advanceTimersByTimeAsync(1000);
    expect(onStats).toHaveBeenLastCalledWith(stats, expect.anything(), {
      requestedInputFps: 15,
      inputTrackFps: 30,
      countedInputFps: 15,
      inputFpsSource: 'track-counter',
    });
  });

  it('reduces outgoing frame size after sustained low FPS and restores it with headroom', async () => {
    currentStats = {...stats, fps: 10};
    await session.start();
    const onTrackChanged = jest.fn();
    session.onTrackChanged = onTrackChanged;
    await jest.advanceTimersByTimeAsync(14000);
    expect(createPipeline).toHaveBeenCalledTimes(2);
    expect(createPipeline).toHaveBeenLastCalledWith(
      expect.any(MediaStream),
      expect.objectContaining({outputResolution: {w: 1280, h: 720}, adaptive: true}),
    );
    expect(pipelines[0].destroy).toHaveBeenCalled();
    expect(session.stream.getVideoTracks()).toEqual(pipelines[1].stream.getVideoTracks());
    expect(onTrackChanged).toHaveBeenCalledTimes(1);
    currentStats = {...stats};
    await jest.advanceTimersByTimeAsync(24000);
    expect(createPipeline).toHaveBeenLastCalledWith(
      expect.any(MediaStream),
      expect.objectContaining({outputResolution: {w: 1920, h: 1080}}),
    );
  });

  it('keeps the chosen blur when swapping output resolution', async () => {
    await session.start();
    await session.setBackground({blur: {strength: 'high'}});
    await session.setQuality('nhd');
    expect(createPipeline).toHaveBeenLastCalledWith(
      expect.any(MediaStream),
      expect.objectContaining({
        outputResolution: {w: 640, h: 360},
        background: {blur: {strength: 'high'}},
        preset: 'auto',
        adaptive: true,
      }),
    );
  });

  it('forwards a replacement output track after Longpipe recovery', async () => {
    await session.start();
    const onTrackChanged = jest.fn();
    session.onTrackChanged = onTrackChanged;
    const options: PipelineOptions = createPipeline.mock.calls[0][1];
    const replacement = createTrack();
    options.onTrackChanged?.({
      stream: new MediaStream([replacement]),
      videoTrack: replacement,
      previousTrack: session.stream.getVideoTracks()[0],
      reason: 'worker-crash',
    });
    expect(session.stream.getVideoTracks()).toEqual([replacement]);
    expect(onTrackChanged).toHaveBeenCalledTimes(1);
  });

  it('releases owned tracks and stops polling without stopping the caller camera', async () => {
    const camera = createTrack();
    session.release();
    session = new LongpipeBackgroundSession(camera, {background: 'blur', quality: 'auto', onStats}, createPipeline);
    await session.start();
    session.release();
    session.release();
    await jest.advanceTimersByTimeAsync(20000);
    expect(pipelines[0].destroy).toHaveBeenCalledTimes(1);
    expect(pipelines[0].getStats).not.toHaveBeenCalled();
    expect(camera.readyState).toBe('live');
  });

  it('settles a pending initialization when the session is released', async () => {
    let finishReady: ((info: ReadyInfo) => void) | undefined;
    const ready = new Promise<ReadyInfo>(resolve => {
      finishReady = resolve;
    });
    const pending: LongpipePipeline = {
      ready,
      stream: new MediaStream([createTrack()]),
      setBackground: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn().mockResolvedValue(stats),
      destroy: jest.fn(),
    };
    createPipeline.mockReturnValue(pending);
    const starting = session.start();
    const rejection = expect(starting).rejects.toThrow('released during initialization');
    await jest.advanceTimersByTimeAsync(0);
    session.release();
    await rejection;
    finishReady?.({backend: 'webgpu', preset: 'medium', dtype: 'f16'});
    expect(pending.destroy).toHaveBeenCalled();
    expect(session.stream.getTracks()).toHaveLength(0);
  });
});
