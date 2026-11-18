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

import {
  EffectsPipeline,
  type BackgroundInput,
  type PipelineOptions,
  type PipelineStats,
  type ReadyInfo,
} from 'longpipe';
import {noop} from 'noop-esm';

import {BACKGROUND_RESOLUTIONS, type QualityMode} from './backgroundEffectsResolution';

import {getLogger} from '../../util/logger';

const POLL_INTERVAL_MS = 1000;
const DOWNGRADE_SAMPLES = 5;
const UPGRADE_SAMPLES = 15;
const CHANGE_COOLDOWN_MS = 10000;
const DEFAULT_FPS = 30;
const LOW_FPS_RATIO = 0.667;
const HEALTHY_FPS_RATIO = 0.9;
const PIXEL_ALIGNMENT = 2;
const MILLISECONDS_PER_SECOND = 1000;
const UPGRADE_BUDGET_RATIO = 0.3;
const LONG_EDGES = Object.values(BACKGROUND_RESOLUTIONS).map(resolution => {
  return resolution.width;
});

// Longpipe transfers ImageBitmaps to its worker. Keep the selected source reusable.
const copyBackground = async (background: BackgroundInput): Promise<BackgroundInput> => {
  if (typeof ImageBitmap !== 'undefined' && background instanceof ImageBitmap) {
    return createImageBitmap(background);
  }
  return background;
};

export type LongpipePipeline = Pick<EffectsPipeline, 'ready' | 'stream' | 'setBackground' | 'getStats' | 'destroy'>;
export type PipelineFactory = (stream: MediaStream, options: PipelineOptions) => LongpipePipeline;
export type FrameSize = {width: number; height: number};
export type BackgroundFrameSizes = {
  input: FrameSize | null;
  output: FrameSize | null;
  requestedOutput: FrameSize | null;
};
export type BackgroundFpsDiagnostics = {
  requestedInputFps: number | null;
  inputTrackFps: number | null;
  countedInputFps: number | null;
  inputFpsSource: 'track-settings' | 'track-counter' | 'video-frame-callback' | 'unknown';
};

const getFrameSize = (track: MediaStreamTrack | undefined): FrameSize | null => {
  const {width, height} = track?.getSettings() ?? {};
  if (width === undefined || height === undefined || width <= 0 || height <= 0) {
    return null;
  }
  return {width, height};
};

export type BackgroundSessionOptions = {
  background: BackgroundInput;
  quality: QualityMode;
  maximumLongEdge?: number;
  onStats: (stats: PipelineStats, frameSizes: BackgroundFrameSizes, fps: BackgroundFpsDiagnostics) => void;
};
export type BackgroundEffectsSession = Pick<
  LongpipeBackgroundSession,
  'stream' | 'onTrackChanged' | 'setBackground' | 'setQuality' | 'setMaximumLongEdge' | 'release'
>;

/** Owns the effect output and cloned camera track, including resolution changes. */
export class LongpipeBackgroundSession {
  readonly stream = new MediaStream();
  onTrackChanged: (() => void) | undefined;
  private readonly logger = getLogger('LongpipeBackgroundSession');
  private readonly input: MediaStreamTrack;
  private readonly originalSettings: MediaTrackSettings;
  private pipeline: LongpipePipeline | undefined;
  private pendingPipeline: LongpipePipeline | undefined;
  private pipelineInput: MediaStreamTrack | undefined;
  private pendingInput: MediaStreamTrack | undefined;
  private cancelInitialization: (() => void) | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private released = false;
  private queue: Promise<unknown> = Promise.resolve();
  private lowSamples = 0;
  private highSamples = 0;
  private lastChangeAt = 0;
  private longEdge: number;
  private background: BackgroundInput;
  private quality: QualityMode;
  private maximumResolution: number;
  private requestedOutput: FrameSize | null = null;
  private previousInputSample: {frames: number; time: number} | undefined;

  constructor(
    input: MediaStreamTrack,
    private readonly options: BackgroundSessionOptions,
    private readonly createPipeline: PipelineFactory = (stream, pipelineOptions) => {
      return new EffectsPipeline(stream, pipelineOptions);
    },
  ) {
    this.input = input.clone();
    this.originalSettings = input.getSettings();
    this.background = options.background;
    this.quality = options.quality;
    this.maximumResolution = options.maximumLongEdge ?? BACKGROUND_RESOLUTIONS.fhd.width;
    this.longEdge = this.maximumLongEdge();
  }

  async start(): Promise<void> {
    try {
      await this.replacePipeline(this.longEdge);
      this.schedulePoll();
    } catch (error) {
      this.release();
      throw error;
    }
  }

  setBackground(background: BackgroundInput): Promise<void> {
    return this.enqueue(async () => {
      this.background = background;
      if (this.pipeline !== undefined) {
        await this.pipeline.setBackground(await copyBackground(background));
      }
    });
  }

  setQuality(quality: QualityMode): Promise<void> {
    return this.enqueue(async () => {
      this.quality = quality;
      await this.replacePipeline(this.maximumLongEdge());
    });
  }

  setMaximumLongEdge(maximum: number): Promise<void> {
    return this.enqueue(async () => {
      this.maximumResolution = maximum;
      await this.replacePipeline(this.maximumLongEdge());
    });
  }

  release(): void {
    if (this.released) {
      return;
    }
    this.released = true;
    clearTimeout(this.timer);
    this.onTrackChanged = undefined;
    this.cancelInitialization?.();
    this.pendingPipeline?.destroy();
    this.pipeline?.destroy();
    this.pendingInput?.stop();
    this.pipelineInput?.stop();
    this.input.stop();
    this.stream.getTracks().forEach(track => {
      track.stop();
    });
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    const result = this.queue.then(async () => {
      if (!this.released) {
        await operation();
      }
    });
    this.queue = result.catch(noop);
    return result;
  }

  private maximumLongEdge(): number {
    const {width = 1280, height = 720} = this.originalSettings;
    const tier = this.quality === 'auto' ? 'fhd' : this.quality;
    return Math.min(Math.max(width, height), BACKGROUND_RESOLUTIONS[tier].width, this.maximumResolution);
  }

  private async replacePipeline(longEdge: number): Promise<void> {
    const {width = 1280, height = 720} = this.originalSettings;
    const scale = longEdge / Math.max(width, height);
    const outputResolution = {
      w: Math.max(PIXEL_ALIGNMENT, Math.round((width * scale) / PIXEL_ALIGNMENT) * PIXEL_ALIGNMENT),
      h: Math.max(PIXEL_ALIGNMENT, Math.round((height * scale) / PIXEL_ALIGNMENT) * PIXEL_ALIGNMENT),
    };
    await this.input.applyConstraints({
      ...this.input.getConstraints(),
      width: {ideal: outputResolution.w},
      height: {ideal: outputResolution.h},
    });
    if (this.released) {
      return;
    }
    const pipelineInput = this.input.clone();
    this.pendingInput = pipelineInput;
    try {
      const background = await copyBackground(this.background);
      if (this.released) {
        if (typeof ImageBitmap !== 'undefined' && background instanceof ImageBitmap) {
          background.close();
        }
        pipelineInput.stop();
        return;
      }
      const pipeline = this.createPipeline(new MediaStream([pipelineInput]), {
        model: 'longpipe',
        preset: 'auto',
        adaptive: true,
        audio: 'drop',
        background,
        outputResolution,
        onError: error => {
          this.logger.warn('Longpipe pipeline error', {error});
        },
        onTrackChanged: change => {
          if (!this.released && this.pipeline === pipeline) {
            this.useOutputTrack(change.videoTrack);
          }
        },
      });
      this.pendingPipeline = pipeline;
      const ready = await new Promise<ReadyInfo>((resolve, reject) => {
        this.cancelInitialization = () => {
          reject(new Error('Background session released during initialization'));
        };
        void pipeline.ready.then(resolve, reject);
      });
      if (this.released) {
        pipeline.destroy();
        return;
      }
      if (ready.backend === 'none') {
        throw new Error('Longpipe could not initialize an effects backend');
      }
      const track = pipeline.stream.getVideoTracks()[0];
      if (track === undefined) {
        throw new Error('Longpipe did not provide an output video track');
      }
      const previous = this.pipeline;
      const previousInput = this.pipelineInput;
      this.pipeline = pipeline;
      this.pipelineInput = pipelineInput;
      this.previousInputSample = undefined;
      this.requestedOutput = {width: outputResolution.w, height: outputResolution.h};
      this.useOutputTrack(track);
      previous?.destroy();
      previousInput?.stop();
      this.longEdge = longEdge;
      this.lowSamples = 0;
      this.highSamples = 0;
      this.lastChangeAt = performance.now();
    } catch (error) {
      this.pendingPipeline?.destroy();
      pipelineInput.stop();
      throw error;
    } finally {
      this.pendingPipeline = undefined;
      this.pendingInput = undefined;
      this.cancelInitialization = undefined;
    }
  }

  private useOutputTrack(track: MediaStreamTrack): void {
    this.stream.getVideoTracks().forEach(previous => {
      this.stream.removeTrack(previous);
    });
    this.stream.addTrack(track);
    this.onTrackChanged?.();
  }

  private schedulePoll(): void {
    if (this.released) {
      return;
    }
    this.timer = setTimeout(() => {
      void this.enqueue(async () => {
        const stats = await this.pipeline?.getStats();
        if (stats === undefined || this.released) {
          return;
        }
        this.options.onStats(
          stats,
          {
            input: getFrameSize(this.pipelineInput),
            output: getFrameSize(this.stream.getVideoTracks()[0]),
            requestedOutput: this.requestedOutput,
          },
          this.getFpsDiagnostics(stats),
        );
        await this.adaptResolution(stats);
      })
        .catch((error: unknown) => {
          this.logger.warn('Could not update Longpipe performance', {error});
        })
        .finally(() => {
          this.schedulePoll();
        });
    }, POLL_INTERVAL_MS);
  }

  private getFpsDiagnostics(stats: PipelineStats): BackgroundFpsDiagnostics {
    const track = this.pipelineInput;
    const requested = track?.getConstraints().frameRate;
    const requestedInputFps =
      typeof requested === 'number' ? requested : (requested?.exact ?? requested?.ideal ?? requested?.max ?? null);
    const trackStats = (track as (MediaStreamTrack & {stats?: {totalFrames?: number}}) | undefined)?.stats;
    const frames = trackStats?.totalFrames;
    const hasCounter = typeof frames === 'number' && Number.isFinite(frames);
    const time = performance.now();
    const previous = this.previousInputSample;
    let countedInputFps: number | null = null;
    if (hasCounter) {
      if (previous !== undefined && time > previous.time && frames >= previous.frames) {
        countedInputFps = ((frames - previous.frames) * MILLISECONDS_PER_SECOND) / (time - previous.time);
      }
      this.previousInputSample = {frames, time};
    } else {
      this.previousInputSample = undefined;
    }
    let inputFpsSource: BackgroundFpsDiagnostics['inputFpsSource'] = 'unknown';
    if (stats.inputPath === 'mstp') {
      inputFpsSource = hasCounter ? 'track-counter' : 'track-settings';
    } else if (stats.inputPath === 'rvfc-postmessage') {
      inputFpsSource = 'video-frame-callback';
    }
    return {
      requestedInputFps,
      inputTrackFps: track?.getSettings().frameRate ?? null,
      countedInputFps,
      inputFpsSource,
    };
  }

  private async adaptResolution(stats: PipelineStats): Promise<void> {
    if (
      this.quality !== 'auto' ||
      stats.status !== 'running' ||
      document.hidden ||
      performance.now() - this.lastChangeAt < CHANGE_COOLDOWN_MS
    ) {
      return;
    }
    const targetFps = Math.min(this.originalSettings.frameRate ?? DEFAULT_FPS, DEFAULT_FPS);
    if (targetFps <= 0) {
      return;
    }
    const overloaded = stats.fps < targetFps * LOW_FPS_RATIO;
    this.lowSamples = overloaded ? this.lowSamples + 1 : 0;
    const hasHeadroom =
      !overloaded &&
      stats.fps >= targetFps * HEALTHY_FPS_RATIO &&
      stats.modelMs > 0 &&
      stats.modelMs < (MILLISECONDS_PER_SECOND / targetFps) * UPGRADE_BUDGET_RATIO;
    this.highSamples = hasHeadroom ? this.highSamples + 1 : 0;
    if (this.lowSamples >= DOWNGRADE_SAMPLES) {
      const lower = LONG_EDGES.find(edge => {
        return edge < this.longEdge;
      });
      if (lower !== undefined) {
        await this.replacePipeline(lower);
      }
    } else if (this.highSamples >= UPGRADE_SAMPLES) {
      const higher = [...LONG_EDGES.toReversed(), this.maximumLongEdge()].find(edge => {
        return edge > this.longEdge && edge <= this.maximumLongEdge();
      });
      if (higher !== undefined) {
        await this.replacePipeline(higher);
      }
    }
  }
}

export const createLongpipeBackgroundSession = async (
  input: MediaStreamTrack,
  options: BackgroundSessionOptions,
): Promise<LongpipeBackgroundSession> => {
  const session = new LongpipeBackgroundSession(input, options);
  await session.start();
  return session;
};
