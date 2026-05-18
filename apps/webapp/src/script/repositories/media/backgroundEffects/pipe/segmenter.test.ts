import {getSegmenterModelUpdatedOptions, runSegmenter} from 'Repositories/media/backgroundEffects/pipe/segmenter';

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


