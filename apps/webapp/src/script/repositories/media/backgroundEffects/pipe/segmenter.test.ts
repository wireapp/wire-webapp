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

import {getSegmenterModelUpdatedOptions, runSegmenter} from 'Repositories/media/backgroundEffects/pipe/segmenter';
import {ImageSegmenter} from "@mediapipe/tasks-vision";

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

jest.mock('./renderer', () => ({
  WebGLRenderer: jest.fn().mockImplementation(() => ({
    render: jest.fn(),
    close: jest.fn(),
  })),
}));

jest.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: {
    forVisionTasks: jest.fn().mockResolvedValue({}),
  },
  ImageSegmenter: {
    createFromOptions: jest.fn().mockResolvedValue({
      close: jest.fn(),
      setOptions: jest.fn(),
      segmentForVideo: jest.fn(),
    }),
  },
}));

jest.mock('./filter', () => ({
  VideoFilter: jest.fn().mockImplementation(() => ({
    render: jest.fn(),
    destroy: jest.fn(),
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
  createMetricsWindow: jest.fn(() => ({})),
  pushMetricsSample: jest.fn(),
  buildMetrics: jest.fn(() => ({})),
}));

describe('segmenter tests', () => {
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

  describe('runSegmenter webgl context handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      Object.assign(globalThis, {
        OffscreenCanvas: jest.fn().mockImplementation(() => ({
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          width: 1,
          height: 1,
        })),
      });

      Object.assign(globalThis, {
        WritableStream: jest.fn().mockImplementation((sink, strategy) => ({
          sink,
          strategy,
        })),
        CountQueuingStrategy: jest.fn().mockImplementation(options => options),
      });
    });

    it('closes renderer on webglcontextlost and recreates it on webglcontextrestored', async () => {
      const listeners = new Map<string, EventListener>();

      const canvas = {
        addEventListener: jest.fn((eventName: string, listener: EventListener) => {
          listeners.set(eventName, listener);
        }),
        removeEventListener: jest.fn(),
      } as unknown as OffscreenCanvas;

      const readable = {
        pipeTo: jest.fn().mockResolvedValue(undefined),
      } as unknown as ReadableStream;

      await runSegmenter(
        canvas,
        readable,
        {
          enabled: true,
          quality: 'auto',
        } as any,
        jest.fn(),
      );

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

  const flushPromises = () => new Promise<void>(resolve => setImmediate(resolve));
  describe('runSegmenter restart queue', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      Object.assign(globalThis, {
        OffscreenCanvas: jest.fn().mockImplementation(() => ({
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          width: 1,
          height: 1,
        })),
        WritableStream: jest.fn().mockImplementation(sink => ({
          sink,
        })),
        CountQueuingStrategy: jest.fn().mockImplementation(options => options),
      });
    });

    it('restarts the segmenter sequentially when restartEvery is reached multiple times', async () => {
      const closeFirstSegmenter = jest.fn();
      const closeSecondSegmenter = jest.fn();

      let resolveSecondCreate!: () => void;

      const firstSegmenter = {
        close: closeFirstSegmenter,
        setOptions: jest.fn(),
        segmentForVideo: jest.fn(),
      };

      const secondSegmenter = {
        close: closeSecondSegmenter,
        setOptions: jest.fn(),
        segmentForVideo: jest.fn(),
      };

      const thirdSegmenter = {
        close: jest.fn(),
        setOptions: jest.fn(),
        segmentForVideo: jest.fn(),
      };

      (ImageSegmenter.createFromOptions as jest.Mock)
        .mockResolvedValueOnce(firstSegmenter)
        .mockImplementationOnce(
          () =>
            new Promise(resolve => {
              resolveSecondCreate = () => resolve(secondSegmenter);
            }),
        )
        .mockResolvedValueOnce(thirdSegmenter);

      let writerSink!: UnderlyingSink<VideoFrame>;

      const readable = {
        pipeTo: jest.fn(writer => {
          writerSink = (writer as any).sink;
          return Promise.resolve();
        }),
      } as unknown as ReadableStream;

      const canvas = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      } as unknown as OffscreenCanvas;

      await runSegmenter(
        canvas,
        readable,
        {
          enabled: false,
          quality: 'bypass',
          restartEvery: 1,
        } as any,
        jest.fn(),
      );

      const firstFrame = {
        codedWidth: 640,
        codedHeight: 480,
        timestamp: 1,
        close: jest.fn(),
      } as unknown as VideoFrame;

      const secondFrame = {
        codedWidth: 640,
        codedHeight: 480,
        timestamp: 2,
        close: jest.fn(),
      } as unknown as VideoFrame;

      await writerSink.write!(firstFrame, {} as WritableStreamDefaultController);
      await flushPromises();

      expect(ImageSegmenter.createFromOptions).toHaveBeenCalledTimes(2);

      await writerSink.write!(secondFrame, {} as WritableStreamDefaultController);
      await flushPromises();

      expect(ImageSegmenter.createFromOptions).toHaveBeenCalledTimes(2);

      resolveSecondCreate();

      await flushPromises();
      await flushPromises();

      expect(ImageSegmenter.createFromOptions).toHaveBeenCalledTimes(3);
      expect(closeFirstSegmenter).toHaveBeenCalled();
      expect(closeSecondSegmenter).toHaveBeenCalled();
    });
  });
});
