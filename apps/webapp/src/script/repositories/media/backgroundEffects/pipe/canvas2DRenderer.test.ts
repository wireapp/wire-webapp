import {createCanvas2DRenderer} from './canvas2DRenderer';
import type {WorkerProcessVideoTrackOptions} from './options';

jest.mock('Repositories/media/backgroundEffects/helper/logger', () => ({
  getSafeLogger: () => ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockDrawImage = jest.fn();
const mockGetImageData = jest.fn();
const mockPutImageData = jest.fn();
const mockFillRect = jest.fn();

function createOptions(): WorkerProcessVideoTrackOptions {
  return {
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
    smoothing: 1,
    smoothstepMin: 0,
    smoothstepMax: 1,
    backgroundSource: null,
  };
}

function createCanvas(): OffscreenCanvas {
  return {
    width: 1,
    height: 1,
    getContext: jest.fn().mockReturnValue({
      drawImage: mockDrawImage,
      getImageData: mockGetImageData,
      putImageData: mockPutImageData,
      fillRect: mockFillRect,
      fillStyle: '',
      filter: '',
    }),
  } as unknown as OffscreenCanvas;
}

function createVideoFrame(): VideoFrame {
  return {
    displayWidth: 2,
    displayHeight: 2,
  } as unknown as VideoFrame;
}

class MockOffscreenCanvas {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  getContext = jest.fn().mockReturnValue({
    drawImage: mockDrawImage,
    getImageData: mockGetImageData,
    putImageData: mockPutImageData,
    fillRect: mockFillRect,
    fillStyle: '',
    filter: '',
  });
}

Object.defineProperty(globalThis, 'OffscreenCanvas', {
  writable: true,
  value: MockOffscreenCanvas,
});

Object.defineProperty(globalThis, 'ImageData', {
  writable: true,
  value: class MockImageData {
    constructor(
      public data: Uint8ClampedArray,
      public width: number,
      public height: number,
    ) {}
  },
});

describe('createCanvas2DRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetImageData.mockReturnValue({
      data: new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 100, 110, 120, 255]),
    });
  });

  it('throws when 2D context is not available', () => {
    const canvas = {
      getContext: jest.fn().mockReturnValue(null),
    } as unknown as OffscreenCanvas;

    expect(() => createCanvas2DRenderer(canvas)).toThrow('2D canvas context not available');
  });

  it('renders passthrough frame when options are disabled', () => {
    const canvas = createCanvas();
    const renderer = createCanvas2DRenderer(canvas);
    const videoFrame = createVideoFrame();

    renderer.render(videoFrame, {
      ...createOptions(),
      enabled: false,
    });

    expect(mockDrawImage).toHaveBeenCalledWith(videoFrame, 0, 0, 2, 2);
    expect(mockPutImageData).not.toHaveBeenCalled();
  });

  it('renders passthrough frame when quality is bypass', () => {
    const canvas = createCanvas();
    const renderer = createCanvas2DRenderer(canvas);
    const videoFrame = createVideoFrame();

    renderer.render(videoFrame, {
      ...createOptions(),
      quality: 'bypass',
    });

    expect(mockDrawImage).toHaveBeenCalledWith(videoFrame, 0, 0, 2, 2);
    expect(mockPutImageData).not.toHaveBeenCalled();
  });

  it('renders virtual background when mask data is provided', () => {
    const canvas = createCanvas();
    const renderer = createCanvas2DRenderer(canvas);
    const videoFrame = createVideoFrame();

    renderer.render(videoFrame, createOptions(), new Float32Array([1, 1, 1, 1]), new Float32Array([1, 1, 1, 1]));

    expect(mockFillRect).toHaveBeenCalledWith(0, 0, 2, 2);
    expect(mockPutImageData).toHaveBeenCalled();
  });

  it('does not render after close', () => {
    const canvas = createCanvas();
    const renderer = createCanvas2DRenderer(canvas);

    renderer.close();
    renderer.render(createVideoFrame(), createOptions());

    expect(mockDrawImage).not.toHaveBeenCalled();
    expect(mockPutImageData).not.toHaveBeenCalled();
  });

  it('renders blur mode when bgBlur and bgBlurRadius are enabled', () => {
    const canvas = createCanvas();
    const renderer = createCanvas2DRenderer(canvas);

    renderer.render(
      createVideoFrame(),
      {
        ...createOptions(),
        bgBlur: 12,
        bgBlurRadius: 12,
      },
      new Float32Array([1, 1, 1, 1]),
      new Float32Array([1, 1, 1, 1]),
    );

    expect(mockPutImageData).toHaveBeenCalled();
  });
});
