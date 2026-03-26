/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {Segmenter} from './segmenter';

// Mock MediaPipe
jest.mock('@mediapipe/tasks-vision', () => {
  const mockSegmenter = {
    segmentForVideo: jest.fn(),
    close: jest.fn(),
  };

  return {
    FilesetResolver: {
      forVisionTasks: jest.fn().mockResolvedValue({}),
    },
    ImageSegmenter: {
      createFromOptions: jest.fn().mockResolvedValue(mockSegmenter),
    },
  };
});

describe('Segmenter', () => {
  const MODEL_PATH = '/test/model.tflite';
  const originalFetch = global.fetch;
  let mockSegmenter: any;
  let mockResizeCtx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  let mockMaskCtx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  let mockFrame: ImageBitmap;
  let createImageBitmapSpy: jest.SpyInstance;
  let performanceNowSpy: jest.SpyInstance;
  let fetchSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Define createImageBitmap if it doesn't exist
    if (typeof global.createImageBitmap === 'undefined') {
      (global as any).createImageBitmap = jest.fn();
    }

    // Define OffscreenCanvas if it doesn't exist
    if (typeof global.OffscreenCanvas === 'undefined') {
      (global as any).OffscreenCanvas = class OffscreenCanvas {
        constructor(
          public width: number,
          public height: number,
        ) {
        }

        getContext(): any {
          return null;
        }
      };
    }

    // Ensure ImageData is available (jsdom doesn't provide it by default)
    if (typeof global.ImageData === 'undefined') {
      (global as any).ImageData = class ImageData {
        public readonly data: Uint8ClampedArray;
        public readonly width: number;
        public readonly height: number;

        constructor(width: number, height: number) {
          this.width = width;
          this.height = height;
          this.data = new Uint8ClampedArray(width * height * 4);
        }
      };
    }

    // Mock MediaPipe ImageSegmenter
    const {ImageSegmenter} = require('@mediapipe/tasks-vision');
    mockSegmenter = {
      segmentForVideo: jest.fn(),
      close: jest.fn(),
    };
    ImageSegmenter.createFromOptions.mockResolvedValue(mockSegmenter);

    // Mock canvas contexts
    mockResizeCtx = {
      drawImage: jest.fn(),
    } as any;
    mockMaskCtx = {
      clearRect: jest.fn(),
      putImageData: jest.fn(),
    } as any;

    // Mock ImageBitmap - needs to be compatible with jsdom's drawImage
    // Create a real canvas and use it as ImageBitmap-like object
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = 640;
    frameCanvas.height = 480;
    mockFrame = frameCanvas as any; // Use canvas as ImageBitmap for jsdom compatibility

    // Mock createImageBitmap
    const mockImageBitmap = {
      width: 256,
      height: 144,
      close: jest.fn(),
    } as any;
    createImageBitmapSpy = jest.spyOn(global, 'createImageBitmap' as any).mockResolvedValue(mockImageBitmap);

    // Mock performance.now()
    let timeCounter = 0;
    performanceNowSpy = jest.spyOn(performance, 'now').mockImplementation(() => {
      timeCounter += 10;
      return timeCounter;
    });

    // Mock fetch - ensure it exists first
    if (typeof global.fetch === 'undefined') {
      (global as any).fetch = jest.fn();
    }
    fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalFetch !== undefined) {
      global.fetch = originalFetch;
    } else {
      delete (global as any).fetch;
    }
  });

  describe('constructor', () => {
    it('creates segmenter with model path and CPU delegate', () => {
      const segmenter = new Segmenter(MODEL_PATH, 'CPU');
      expect(segmenter).toBeDefined();
    });

    it('creates segmenter with GPU delegate', () => {
      const segmenter = new Segmenter(MODEL_PATH, 'GPU');
      expect(segmenter).toBeDefined();
    });

    it('defaults to CPU delegate when not specified', () => {
      const segmenter = new Segmenter(MODEL_PATH);
      expect(segmenter).toBeDefined();
    });
  });

  describe('init', () => {
    it('initializes MediaPipe segmenter with correct options', async () => {
      const segmenter = new Segmenter(MODEL_PATH, 'CPU');
      const {FilesetResolver, ImageSegmenter} = require('@mediapipe/tasks-vision');

      await segmenter.init();

      expect(FilesetResolver.forVisionTasks).toHaveBeenCalledWith('/min/mediapipe/wasm');
      expect(ImageSegmenter.createFromOptions).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          baseOptions: {
            modelAssetPath: MODEL_PATH,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          outputCategoryMask: true,
          outputConfidenceMasks: true,
        }),
      );
    });

    it('initializes with GPU delegate when specified', async () => {
      const segmenter = new Segmenter(MODEL_PATH, 'GPU');
      const {ImageSegmenter} = require('@mediapipe/tasks-vision');

      await segmenter.init();

      expect(ImageSegmenter.createFromOptions).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          baseOptions: {
            modelAssetPath: MODEL_PATH,
            delegate: 'GPU',
          },
        }),
      );
    });

    it('probes for WASM asset', async () => {
      const segmenter = new Segmenter(MODEL_PATH);
      await segmenter.init();

      expect(fetchSpy).toHaveBeenCalledWith('/min/mediapipe/wasm/vision_wasm_internal.wasm', {method: 'HEAD'});
    });

    it('probes for model asset', async () => {
      const segmenter = new Segmenter(MODEL_PATH);
      await segmenter.init();

      expect(fetchSpy).toHaveBeenCalledWith(MODEL_PATH, {method: 'HEAD'});
    });

    it('segmenter exists when assets are available', async () => {
      fetchSpy.mockResolvedValue({ok: true, status: 200} as Response);
      const segmenter = new Segmenter(MODEL_PATH);

      await segmenter.init();

      expect(segmenter.getSegmenter()).not.toBeNull();
    });

    it('probeAsset has no effect', async () => {
      fetchSpy.mockResolvedValue({ok: false, status: 404} as Response);
      const segmenter = new Segmenter(MODEL_PATH);

      await segmenter.init();

      expect(segmenter.getSegmenter()).not.toBeNull();
    });

    it('handles fetch errors gracefully', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));
      const segmenter = new Segmenter(MODEL_PATH);

      await expect(segmenter.init()).resolves.not.toThrow();
    });

    it('skips probe when fetch is unavailable', async () => {
      delete (global as any).fetch;
      const segmenter = new Segmenter(MODEL_PATH);

      await expect(segmenter.init()).resolves.not.toThrow();
    });
  });

  describe('configure', () => {
    it('creates OffscreenCanvas when available', () => {
      const segmenter = new Segmenter(MODEL_PATH);
      const OffscreenCanvasConstructor = global.OffscreenCanvas;
      (global as any).OffscreenCanvas = jest.fn().mockImplementation((width: number, height: number) => {
        return {
          width,
          height,
          getContext: jest.fn().mockReturnValue(mockResizeCtx),
        } as any;
      }) as any;

      segmenter.configure(256, 144);

      expect(global.OffscreenCanvas).toHaveBeenCalledTimes(2); // resize and mask canvases
      expect(global.OffscreenCanvas).toHaveBeenCalledWith(256, 144);

      // Restore
      global.OffscreenCanvas = OffscreenCanvasConstructor;
    });

    it('creates HTMLCanvasElement when OffscreenCanvas unavailable', () => {
      const segmenter = new Segmenter(MODEL_PATH);
      const originalOffscreenCanvas = global.OffscreenCanvas;
      delete (global as any).OffscreenCanvas;

      const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: jest.fn().mockReturnValue(mockResizeCtx),
          } as any;
        }
        return document.createElement(tag);
      });

      segmenter.configure(256, 144);

      expect(createElementSpy).toHaveBeenCalledWith('canvas');
      expect(createElementSpy).toHaveBeenCalledTimes(2); // resize and mask canvases

      // Restore
      global.OffscreenCanvas = originalOffscreenCanvas;
    });

    it('gets 2D context for resize canvas', () => {
      const segmenter = new Segmenter(MODEL_PATH);
      const mockCanvas = {
        getContext: jest.fn().mockReturnValue(mockResizeCtx),
      };
      const OffscreenCanvasConstructor = global.OffscreenCanvas;
      (global as any).OffscreenCanvas = jest.fn().mockImplementation(() => mockCanvas as any);

      segmenter.configure(256, 144);

      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');

      // Restore
      global.OffscreenCanvas = OffscreenCanvasConstructor;
    });

    it('gets 2D context for mask canvas', () => {
      const segmenter = new Segmenter(MODEL_PATH);
      const mockCanvas = {
        getContext: jest.fn().mockReturnValue(mockMaskCtx),
      };
      const OffscreenCanvasConstructor = global.OffscreenCanvas;
      (global as any).OffscreenCanvas = jest.fn().mockImplementation(() => mockCanvas as any);

      segmenter.configure(256, 144);

      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');

      // Restore
      global.OffscreenCanvas = OffscreenCanvasConstructor;
    });

    it('is idempotent - returns early if dimensions unchanged', () => {
      const segmenter = new Segmenter(MODEL_PATH);
      const OffscreenCanvasConstructor = global.OffscreenCanvas;
      const offscreenCanvasMock = jest.fn().mockImplementation((width: number, height: number) => {
        return {
          width,
          height,
          getContext: jest.fn().mockReturnValue(mockResizeCtx),
        } as any;
      });
      (global as any).OffscreenCanvas = offscreenCanvasMock;

      segmenter.configure(256, 144);
      const firstCallCount = offscreenCanvasMock.mock.calls.length;

      segmenter.configure(256, 144);
      const secondCallCount = offscreenCanvasMock.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount); // No additional calls

      // Restore
      global.OffscreenCanvas = OffscreenCanvasConstructor;
    });

    it('updates canvases when dimensions change', () => {
      const segmenter = new Segmenter(MODEL_PATH);
      const OffscreenCanvasConstructor = global.OffscreenCanvas;
      const offscreenCanvasMock = jest.fn().mockImplementation((width: number, height: number) => {
        return {
          width,
          height,
          getContext: jest.fn().mockReturnValue(mockResizeCtx),
        } as any;
      });
      (global as any).OffscreenCanvas = offscreenCanvasMock;

      segmenter.configure(256, 144);
      segmenter.configure(160, 96);

      expect(offscreenCanvasMock).toHaveBeenCalledWith(160, 96);

      // Restore
      global.OffscreenCanvas = OffscreenCanvasConstructor;
    });
  });

  describe('segment', () => {
    // Helper to setup segmenter with proper mocks
    async function setupSegmenter(): Promise<Segmenter> {
      const segmenter = new Segmenter(MODEL_PATH);
      await segmenter.init();

      // Mock OffscreenCanvas to return canvases with our mocked contexts
      const OffscreenCanvasConstructor = global.OffscreenCanvas;
      let callCount = 0;
      (global as any).OffscreenCanvas = jest.fn().mockImplementation((width: number, height: number) => {
        callCount++;
        return {
          width,
          height,
          getContext: jest.fn().mockReturnValue(callCount === 1 ? mockResizeCtx : mockMaskCtx),
        };
      }) as any;

      segmenter.configure(256, 144);

      // Store constructor for restoration
      (segmenter as any)._offscreenCanvasConstructor = OffscreenCanvasConstructor;

      return segmenter;
    }

    function restoreOffscreenCanvas(segmenter: Segmenter): void {
      const constructor = (segmenter as any)._offscreenCanvasConstructor;
      if (constructor) {
        global.OffscreenCanvas = constructor;
      }
    }

    beforeEach(async () => {
      // Setup segmenter with mocked MediaPipe
      const {ImageSegmenter} = require('@mediapipe/tasks-vision');
      ImageSegmenter.createFromOptions.mockResolvedValue(mockSegmenter);

      // Ensure OffscreenCanvas is available
      if (typeof global.OffscreenCanvas === 'undefined') {
        (global as any).OffscreenCanvas = class OffscreenCanvas {
          constructor(
            public width: number,
            public height: number,
          ) {}
          getContext(): any {
            return null;
          }
        };
      }
    });

    it('returns null mask when segmenter not initialized', async () => {
      const segmenter = new Segmenter(MODEL_PATH);

      const result = await segmenter.segment(mockFrame, 1000);

      expect(result.mask).toBeNull();
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
      expect(result.durationMs).toBe(0);
    });

    it('returns null mask when canvases not configured', async () => {
      const segmenter = new Segmenter(MODEL_PATH);
      await segmenter.init();

      const result = await segmenter.segment(mockFrame, 1000);

      expect(result.mask).toBeNull();
    });

    it('resizes input frame to segmentation resolution', async () => {
      const segmenter = await setupSegmenter();

      const mockImageData = new ImageData(256, 144);
      const mockMask = {
        getAsImageData: jest.fn().mockReturnValue(mockImageData),
      };
      mockSegmenter.segmentForVideo.mockReturnValue({
        confidenceMasks: [mockMask],
      });

      await segmenter.segment(mockFrame, 1000);

      expect(mockResizeCtx.drawImage).toHaveBeenCalledWith(mockFrame, 0, 0, 256, 144);

      restoreOffscreenCanvas(segmenter);
    });

    it('calls segmentForVideo with canvas and timestamp', async () => {
      const segmenter = await setupSegmenter();

      const mockImageData = new ImageData(256, 144);
      const mockMask = {
        getAsImageData: jest.fn().mockReturnValue(mockImageData),
      };
      mockSegmenter.segmentForVideo.mockReturnValue({
        confidenceMasks: [mockMask],
      });

      await segmenter.segment(mockFrame, 1234);

      expect(mockSegmenter.segmentForVideo).toHaveBeenCalledWith(expect.anything(), 1234);

      restoreOffscreenCanvas(segmenter);
    });

    it('handles ImageData mask format', async () => {
      const segmenter = await setupSegmenter();

      const mockImageData = new ImageData(256, 144);
      const mockMask = {
        getAsImageData: jest.fn().mockReturnValue(mockImageData),
      };
      mockSegmenter.segmentForVideo.mockReturnValue({
        confidenceMasks: [mockMask],
      });

      await segmenter.segment(mockFrame, 1000);

      expect(mockMask.getAsImageData).toHaveBeenCalled();
      expect(mockMaskCtx.putImageData).toHaveBeenCalledWith(mockImageData, 0, 0);

      restoreOffscreenCanvas(segmenter);
    });

    it('handles Float32Array mask format', async () => {
      const segmenter = await setupSegmenter();

      const floatData = new Float32Array(256 * 144);
      for (let i = 0; i < floatData.length; i++) {
        floatData[i] = 0.5; // 50% confidence
      }
      const mockMask = {
        getAsFloat32Array: jest.fn().mockReturnValue(floatData),
      };
      mockSegmenter.segmentForVideo.mockReturnValue({
        confidenceMasks: [mockMask],
      });

      await segmenter.segment(mockFrame, 1000);

      expect(mockMask.getAsFloat32Array).toHaveBeenCalled();
      expect(mockMaskCtx.putImageData).toHaveBeenCalled();
      // Verify ImageData was created with correct values (0.5 * 255 = 127.5 ≈ 128)
      const putImageDataCall = (mockMaskCtx.putImageData as jest.Mock).mock.calls[0][0] as ImageData;
      expect(putImageDataCall.data[0]).toBe(128); // R channel
      expect(putImageDataCall.data[1]).toBe(128); // G channel
      expect(putImageDataCall.data[2]).toBe(128); // B channel
      expect(putImageDataCall.data[3]).toBe(128); // A channel (Soft-Edge Rendering if Alpha mask not 100% viewable)

      restoreOffscreenCanvas(segmenter);
    });

    it('handles Uint8Array mask format', async () => {
      const segmenter = await setupSegmenter();

      const uint8Data = new Uint8Array(256 * 144);
      for (let i = 0; i < uint8Data.length; i++) {
        uint8Data[i] = 128; // 50% confidence (128/255)
      }
      const mockMask = {
        getAsUint8Array: jest.fn().mockReturnValue(uint8Data),
      };
      mockSegmenter.segmentForVideo.mockReturnValue({
        confidenceMasks: [mockMask],
      });

      await segmenter.segment(mockFrame, 1000);

      expect(mockMask.getAsUint8Array).toHaveBeenCalled();
      expect(mockMaskCtx.putImageData).toHaveBeenCalled();

      restoreOffscreenCanvas(segmenter);
    });

    it('handles null mask gracefully', async () => {
      const segmenter = await setupSegmenter();

      mockSegmenter.segmentForVideo.mockReturnValue({
        confidenceMasks: [null],
      });

      const result = await segmenter.segment(mockFrame, 1000);

      expect(mockMaskCtx.clearRect).not.toHaveBeenCalled();
      expect(mockMaskCtx.putImageData).not.toHaveBeenCalled();
      expect(result.mask).toBeNull();

      restoreOffscreenCanvas(segmenter);
    });

    it('handles empty confidence masks array', async () => {
      const segmenter = await setupSegmenter();

      mockSegmenter.segmentForVideo.mockReturnValue({
        confidenceMasks: [],
      });

      const result = await segmenter.segment(mockFrame, 1000);

      expect(mockMaskCtx.clearRect).not.toHaveBeenCalled();
      expect(result.mask).toBeNull();

      restoreOffscreenCanvas(segmenter);
    });

    it('creates ImageBitmap from mask canvas', async () => {
      const segmenter = await setupSegmenter();

      const mockImageData = new ImageData(256, 144);
      const mockMask = {
        getAsImageData: jest.fn().mockReturnValue(mockImageData),
      };
      mockSegmenter.segmentForVideo.mockReturnValue({
        confidenceMasks: [mockMask],
      });

      await segmenter.segment(mockFrame, 1000);

      expect(createImageBitmapSpy).toHaveBeenCalled();

      restoreOffscreenCanvas(segmenter);
    });

    it('calculates duration correctly', async () => {
      const segmenter = await setupSegmenter();

      performanceNowSpy.mockReturnValueOnce(100);
      performanceNowSpy.mockReturnValueOnce(150);

      const mockImageData = new ImageData(256, 144);
      const mockMask = {
        getAsImageData: jest.fn().mockReturnValue(mockImageData),
      };
      mockSegmenter.segmentForVideo.mockReturnValue({
        confidenceMasks: [mockMask],
      });

      const result = await segmenter.segment(mockFrame, 1000);

      expect(result.durationMs).toBe(50);

      restoreOffscreenCanvas(segmenter);
    });

    it('returns correct width and height', async () => {
      const segmenter = await setupSegmenter();

      const mockImageData = new ImageData(256, 144);
      const mockMask = {
        getAsImageData: jest.fn().mockReturnValue(mockImageData),
      };
      mockSegmenter.segmentForVideo.mockReturnValue({
        confidenceMasks: [mockMask],
      });

      const result = await segmenter.segment(mockFrame, 1000);

      expect(result.width).toBe(256);
      expect(result.height).toBe(144);

      restoreOffscreenCanvas(segmenter);
    });

    it('handles segmentation errors gracefully', async () => {
      const segmenter = await setupSegmenter();

      const error = new Error('Segmentation failed');
      mockSegmenter.segmentForVideo.mockImplementation(() => {
        throw error;
      });

      const result = await segmenter.segment(mockFrame, 1000);

      expect(result.mask).toBeNull();
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith('[Segmenter] segment failed', error);

      restoreOffscreenCanvas(segmenter);
    });

    it('closes mask resources after released result segmentation', async () => {
      const segmenter = await setupSegmenter();

      const mockMask = {
        getAsImageData: jest.fn().mockReturnValue(new ImageData(256, 144)),
        close: jest.fn(),
      };
      mockSegmenter.segmentForVideo.mockReturnValue({
        confidenceMasks: [mockMask],
      });

      const result = await segmenter.segment(mockFrame, 1000);

      result.release();

      expect(mockMask.close).toHaveBeenCalled();

      restoreOffscreenCanvas(segmenter);
    });

    it('handles mask close errors gracefully', async () => {
      const segmenter = await setupSegmenter();

      const mockMask = {
        getAsImageData: jest.fn().mockReturnValue(new ImageData(256, 144)),
        close: jest.fn().mockImplementation(() => {
          throw new Error('Already closed');
        }),
      };
      mockSegmenter.segmentForVideo.mockReturnValue({
        confidenceMasks: [mockMask],
      });

      // Should not throw
      await expect(segmenter.segment(mockFrame, 1000)).resolves.toBeDefined();
    });

    it('handles null mask in cleanup', async () => {
      const segmenter = await setupSegmenter();

      mockSegmenter.segmentForVideo.mockReturnValue({
        confidenceMasks: [null],
      });

      // Should not throw
      await expect(segmenter.segment(mockFrame, 1000)).resolves.toBeDefined();

      restoreOffscreenCanvas(segmenter);
    });

    it('clamps Float32Array values to 0-1 range', async () => {
      const segmenter = await setupSegmenter();

      const floatData = new Float32Array(256 * 144);
      floatData[0] = 1.5; // Above 1.0
      floatData[1] = -0.5; // Below 0.0
      floatData[2] = 0.5; // Valid

      const mockMask = {
        getAsFloat32Array: jest.fn().mockReturnValue(floatData),
      };
      mockSegmenter.segmentForVideo.mockReturnValue({
        confidenceMasks: [mockMask],
      });

      await segmenter.segment(mockFrame, 1000);

      expect(mockMaskCtx.putImageData).toHaveBeenCalled();
      const putImageDataCall = (mockMaskCtx.putImageData as jest.Mock).mock.calls[0][0] as ImageData;
      expect(putImageDataCall.data[0]).toBe(255); // Clamped to 1.0 -> 255
      expect(putImageDataCall.data[4]).toBe(0); // Clamped to 0.0 -> 0
      expect(putImageDataCall.data[8]).toBe(128); // 0.5 -> 128

      restoreOffscreenCanvas(segmenter);
    });

    it('handles data length mismatch (data shorter than width*height)', async () => {
      const segmenter = await setupSegmenter();

      const floatData = new Float32Array(100); // Shorter than 256*144
      const mockMask = {
        getAsFloat32Array: jest.fn().mockReturnValue(floatData),
      };
      mockSegmenter.segmentForVideo.mockReturnValue({
        confidenceMasks: [mockMask],
      });

      await segmenter.segment(mockFrame, 1000);

      expect(mockMaskCtx.putImageData).toHaveBeenCalled();
      const putImageDataCall = (mockMaskCtx.putImageData as jest.Mock).mock.calls[0][0] as ImageData;
      expect(putImageDataCall.data.length).toBe(256 * 144 * 4); // Full RGBA size

      restoreOffscreenCanvas(segmenter);
    });
  });

  describe('close', () => {
    it('closes MediaPipe segmenter', async () => {
      const segmenter = new Segmenter(MODEL_PATH);
      await segmenter.init();

      segmenter.close();

      expect(mockSegmenter.close).toHaveBeenCalled();
    });

    it('sets segmenter to null', async () => {
      const segmenter = new Segmenter(MODEL_PATH);
      await segmenter.init();

      segmenter.close();

      // After close, segment should return null mask
      const result = await segmenter.segment(mockFrame, 1000);
      expect(result.mask).toBeNull();
    });

    it('handles close when segmenter is null', () => {
      const segmenter = new Segmenter(MODEL_PATH);

      // Should not throw
      expect(() => segmenter.close()).not.toThrow();
    });
  });
});
