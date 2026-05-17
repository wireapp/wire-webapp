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

import {FilesetResolver, ImageSegmenter} from '@mediapipe/tasks-vision';

import {
  getSegmenterModelUpdatedOptions,
  runSegmenter,
  updateSegmenterOptions,
} from 'Repositories/media/backgroundEffects/pipe/segmenter';
import {
  SELFIE_MULTICLASS_MODEL_PATH,
  SELFIE_SEGMENTER_MODEL_PATH,
  WorkerProcessVideoTrackOptions,
} from 'Repositories/media/backgroundEffects/pipe/options';
import {WebGLRenderer} from 'Repositories/media/backgroundEffects/pipe/renderer';

jest.mock('../../../../clock/wallClock', () => ({
  createWallClock: jest.fn(() => ({
    setTimeout: jest.fn((callback: () => void) => {
      callback();
      return 1;
    }),
    clearTimeout: jest.fn(),
    setInterval: jest.fn(),
    clearInterval: jest.fn(),
    currentTimestampInMilliseconds: 0,
    currentDate: new Date(0),
  })),
}));

jest.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: {
    forVisionTasks: jest.fn().mockResolvedValue({wasm: true}),
  },
  ImageSegmenter: {
    createFromOptions: jest.fn().mockResolvedValue({
      close: jest.fn(),
      setOptions: jest.fn(),
      segmentForVideo: jest.fn(),
    }),
  },
}));

jest.mock('./renderer', () => ({
  WebGLRenderer: jest.fn().mockImplementation(() => ({
    close: jest.fn(),
    render: jest.fn(),
  })),
}));

jest.mock('./canvas2DRenderer', () => ({
  createCanvas2DRenderer: jest.fn().mockReturnValue({
    close: jest.fn(),
    render: jest.fn(),
  }),
}));

jest.mock('./filter', () => ({
  VideoFilter: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
    render: jest.fn(),
  })),
}));

jest.mock('Repositories/media/backgroundEffects/helper/logger', () => ({
  getSafeLogger: jest.fn(() => ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('Repositories/media/backgroundEffects/helper/metrics', () => ({
  buildMetrics: jest.fn().mockReturnValue({}),
  createMetricsWindow: jest.fn().mockReturnValue({}),
  pushMetricsSample: jest.fn(),
}));

class MockOffscreenCanvas {
  addEventListener = jest.fn();
  removeEventListener = jest.fn();

  constructor(
    public width: number,
    public height: number,
  ) {}
}

class MockWritableStream {
  constructor(
    public sink?: UnderlyingSink,
    public strategy?: QueuingStrategy,
  ) {}
}

class MockCountQueuingStrategy {
  highWaterMark: number;

  constructor({highWaterMark}: {highWaterMark: number}) {
    this.highWaterMark = highWaterMark;
  }
}

type CreateFromOptions = typeof ImageSegmenter.createFromOptions;

const createFromOptionsMock = ImageSegmenter.createFromOptions as jest.MockedFunction<CreateFromOptions>;
const forVisionTasksMock = FilesetResolver.forVisionTasks as jest.MockedFunction<typeof FilesetResolver.forVisionTasks>;

function createCanvas(): OffscreenCanvas {
  return {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  } as unknown as OffscreenCanvas;
}

function createClosedReadable(): ReadableStream {
  return {
    pipeTo: jest.fn().mockResolvedValue(undefined),
  } as unknown as ReadableStream;
}

function createOptions(
  overrides: WorkerProcessVideoTrackOptions = {
    useWorker: false,
    mode: 'blur',
    blurStrength: 0,
    blur: 0,
    bgBlur: 0,
    bgBlurRadius: 0,
    brightness: 1,
    contrast: 1,
    gamma: 1,
    enabled: true,
    quality: 'auto',
    enableFilters: false,
    wasmLoaderPath: '',
    wasmBinaryPath: '',
    modelPath: '',
    restartEvery: 0,
    borderSmooth: 0,
    smoothing: 0,
    smoothstepMin: 0,
    smoothstepMax: 1,
    backgroundSource: null,
  },
): WorkerProcessVideoTrackOptions {
  return overrides;
}

function createOptionWithWasmPaths(
  options: WorkerProcessVideoTrackOptions,
  wasmLoaderPath: string,
  wasmBinaryPath: string,
) {
  return createOptions({...options, wasmLoaderPath, wasmBinaryPath});
}

describe('segmenter tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Object.defineProperty(globalThis, 'OffscreenCanvas', {
      writable: true,
      value: MockOffscreenCanvas,
    });

    Object.defineProperty(globalThis, 'WritableStream', {
      writable: true,
      value: MockWritableStream,
    });

    Object.defineProperty(globalThis, 'CountQueuingStrategy', {
      writable: true,
      value: MockCountQueuingStrategy,
    });
  });

  describe('getSegmenterModelUpdatedOptions', () => {
    it('returns null when model path has not changed', () => {
      expect(getSegmenterModelUpdatedOptions('model-a.tflite', 'model-a.tflite')).toBeNull();
    });

    it('returns updated options when model path changes', () => {
      expect(getSegmenterModelUpdatedOptions('model-b.tflite', 'model-a.tflite')).toEqual({
        baseOptions: {
          modelAssetPath: 'model-b.tflite',
        },
      });
    });

    it('returns updated options when current model path is undefined', () => {
      expect(getSegmenterModelUpdatedOptions('model-a.tflite', undefined)).toEqual({
        baseOptions: {
          modelAssetPath: 'model-a.tflite',
        },
      });
    });
  });

  describe('runSegmenter', () => {
    it('creates the segmenter with GPU delegate and shared canvas when WebGL is available', async () => {
      const canvas = createCanvas();

      await runSegmenter(canvas, createClosedReadable(), createOptions(), jest.fn(), jest.fn());

      expect(createFromOptionsMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          baseOptions: expect.objectContaining({
            delegate: 'GPU',
          }),
          canvas,
          runningMode: 'VIDEO',
          outputCategoryMask: true,
          outputConfidenceMasks: true,
        }),
      );

      expect(canvas.addEventListener).toHaveBeenCalledWith('webglcontextlost', expect.any(Function), {once: true});
      expect(canvas.addEventListener).toHaveBeenCalledWith('webglcontextrestored', expect.any(Function), {once: true});
    });

  it('falls back to CPU delegate and does not pass canvas when WebGL renderer cannot be created', async () => {
    jest.mocked(WebGLRenderer).mockImplementationOnce(() => {
      throw new Error('WebGL unavailable');
    });
    const canvas = createCanvas();

      await runSegmenter(canvas, createClosedReadable(), createOptions(), jest.fn(), jest.fn());

      expect(createFromOptionsMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          baseOptions: expect.objectContaining({
            delegate: 'CPU',
          }),
          runningMode: 'VIDEO',
          outputCategoryMask: true,
          outputConfidenceMasks: true,
        }),
      );

      const [, options] = createFromOptionsMock.mock.calls[0];
      expect(options).not.toHaveProperty('canvas');
      expect(canvas.addEventListener).not.toHaveBeenCalled();
    });

  it('uses provided wasm paths instead of loading the default vision task fileset', async () => {
    const options = createOptions();
    await runSegmenter(
      createCanvas(),
      createClosedReadable(),
      createOptionWithWasmPaths(options, '/local/tasks-vision.loader.js', '/local/tasks-vision.wasm'),
      jest.fn(),
      jest.fn(),
    );

    expect(forVisionTasksMock).not.toHaveBeenCalled();
    expect(createFromOptionsMock).toHaveBeenCalledWith(
      {
        wasmLoaderPath: '/local/tasks-vision.loader.js',
        wasmBinaryPath: '/local/tasks-vision.wasm',
      },
      expect.anything(),
    );
  });

  it('falls back from multiclass model to selfie segmenter model when WebGL is unavailable', async () => {
    jest.mocked(WebGLRenderer).mockImplementationOnce(() => {
      throw new Error('WebGL unavailable');
    });

    const onRendererFallback = jest.fn();

    await runSegmenter(
      createCanvas(),
      createClosedReadable(),
      createOptions({
        ...createOptions(),
        modelPath: SELFIE_MULTICLASS_MODEL_PATH,
      }),
      jest.fn(),
      onRendererFallback,
    );

    expect(onRendererFallback).toHaveBeenCalledWith(SELFIE_SEGMENTER_MODEL_PATH);

    expect(createFromOptionsMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        baseOptions: expect.objectContaining({
          modelAssetPath: SELFIE_SEGMENTER_MODEL_PATH,
          delegate: 'CPU',
        }),
      }),
    );
  });

  it('does not call renderer fallback when WebGL is unavailable but model is already CPU-compatible', async () => {
    jest.mocked(WebGLRenderer).mockImplementationOnce(() => {
      throw new Error('WebGL unavailable');
    });

    const onRendererFallback = jest.fn();

    await runSegmenter(
      createCanvas(),
      createClosedReadable(),
      createOptions({
        ...createOptions(),
        modelPath: SELFIE_SEGMENTER_MODEL_PATH,
      }),
      jest.fn(),
      onRendererFallback,
    );

    expect(onRendererFallback).not.toHaveBeenCalled();

    expect(createFromOptionsMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        baseOptions: expect.objectContaining({
          modelAssetPath: SELFIE_SEGMENTER_MODEL_PATH,
          delegate: 'CPU',
        }),
      }),
    );
  });
});

  describe('updateSegmenterOptions', () => {
    it('keeps the segmenter options reference stable and updates values', async () => {
      const firstSegmenter = {
        close: jest.fn(),
        setOptions: jest.fn(),
        segmentForVideo: jest.fn(),
      };

      createFromOptionsMock.mockResolvedValueOnce(firstSegmenter as any);

      let writerSink!: UnderlyingSink<VideoFrame>;

      const readable = {
        pipeTo: jest.fn(writer => {
          writerSink = (writer as any).sink;
          return Promise.resolve();
        }),
      } as unknown as ReadableStream;

      const canvas = createCanvas();

      await runSegmenter(
        canvas,
        readable,
        createOptions({
          ...createOptions(),
          enabled: false,
          quality: 'bypass',
          modelPath: 'model-a.tflite',
        }),
        jest.fn(),
      );

      updateSegmenterOptions(
        createOptions({
          ...createOptions(),
          enabled: false,
          quality: 'bypass',
          modelPath: 'model-b.tflite',
        }),
      );

      const frame = {
        codedWidth: 640,
        codedHeight: 480,
        displayWidth: 640,
        displayHeight: 480,
        timestamp: 1,
        close: jest.fn(),
      } as unknown as VideoFrame;

      await writerSink.write!(frame, {} as WritableStreamDefaultController);

      expect(firstSegmenter.setOptions).toHaveBeenCalledWith({
        baseOptions: {
          modelAssetPath: 'model-b.tflite',
        },
      });
    });
  });

  describe('runSegmenter webgl context handling', () => {
    it('closes renderer on webglcontextlost and recreates it on webglcontextrestored', async () => {
      const listeners = new Map<string, EventListener>();

      const canvas = {
        addEventListener: jest.fn((eventName: string, listener: EventListener) => {
          listeners.set(eventName, listener);
        }),
        removeEventListener: jest.fn(),
      } as unknown as OffscreenCanvas;

      const readable = createClosedReadable();

      await runSegmenter(canvas, readable, createOptions(), jest.fn());

      const {WebGLRenderer} = await import('./renderer');
      const {createWallClock} = await import('../../../../clock/wallClock');

      const firstRenderer = (WebGLRenderer as unknown as jest.Mock).mock.results[0].value;

      const lostEvent = {
        preventDefault: jest.fn(),
      } as unknown as Event;

      listeners.get('webglcontextlost')?.(lostEvent);

      expect(lostEvent.preventDefault).toHaveBeenCalled();
      expect(firstRenderer.close).toHaveBeenCalled();

      listeners.get('webglcontextrestored')?.({} as Event);

      expect(createWallClock).toHaveBeenCalled();
      expect(WebGLRenderer).toHaveBeenCalledTimes(2);

      const secondRenderer = (WebGLRenderer as unknown as jest.Mock).mock.results[1].value;
      expect(secondRenderer).toBeDefined();
    });
  });

  describe('runSegmenter restart queue', () => {
    it('queues segmenter restarts sequentially on repeated webglcontextrestored events', async () => {
      const listeners = new Map<string, EventListener>();

      const firstSegmenter = {
        close: jest.fn(),
        setOptions: jest.fn(),
        segmentForVideo: jest.fn(),
      };

      const secondSegmenter = {
        close: jest.fn(),
        setOptions: jest.fn(),
        segmentForVideo: jest.fn(),
      };

      const thirdSegmenter = {
        close: jest.fn(),
        setOptions: jest.fn(),
        segmentForVideo: jest.fn(),
      };

      let resolveSecondCreate!: () => void;

      createFromOptionsMock
        .mockResolvedValueOnce(firstSegmenter as any)
        .mockImplementationOnce(
          () =>
            new Promise(resolve => {
              resolveSecondCreate = () => resolve(secondSegmenter as any);
            }),
        )
        .mockResolvedValueOnce(thirdSegmenter as any);

      const canvas = {
        addEventListener: jest.fn((eventName: string, listener: EventListener) => {
          listeners.set(eventName, listener);
        }),
        removeEventListener: jest.fn(),
      } as unknown as OffscreenCanvas;

      const readable = createClosedReadable();

      await runSegmenter(
        canvas,
        readable,
        createOptions({
          ...createOptions(),
          modelPath: 'model-a.tflite',
        }),
        jest.fn(),
      );

      const lostEvent = {
        preventDefault: jest.fn(),
      } as unknown as Event;

      listeners.get('webglcontextlost')?.(lostEvent);

      expect(lostEvent.preventDefault).toHaveBeenCalled();

      expect(createFromOptionsMock).toHaveBeenCalledTimes(1);

      listeners.get('webglcontextrestored')?.({} as Event);

      await Promise.resolve();

      // Restore schedules the restart asynchronously through:
      // createWallClock -> setTimeout -> restart queue.
      // No second segmenter should exist yet.
      expect(createFromOptionsMock).toHaveBeenCalledTimes(1);

      listeners.get('webglcontextlost')?.(lostEvent);
      listeners.get('webglcontextrestored')?.({} as Event);

      await Promise.resolve();

      // First queued restart starts now.
      expect(createFromOptionsMock).toHaveBeenCalledTimes(2);

      // Second restart must stay queued while the first restart is pending.
      listeners.get('webglcontextlost')?.(lostEvent);
      listeners.get('webglcontextrestored')?.({} as Event);

      await Promise.resolve();

      expect(createFromOptionsMock).toHaveBeenCalledTimes(2);

      // Finish first queued restart.
      resolveSecondCreate();

      await Promise.resolve();
      await Promise.resolve();

      // No additional restart should have started synchronously.
      expect(createFromOptionsMock).toHaveBeenCalledTimes(2);

      expect(firstSegmenter.close).toHaveBeenCalled();
    });
  });
});
