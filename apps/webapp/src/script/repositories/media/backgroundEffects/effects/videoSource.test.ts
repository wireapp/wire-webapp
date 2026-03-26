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

import {VideoSource} from './videoSource';

describe('VideoSource', () => {
  const originalMediaStream = global.MediaStream;
  let mockTrack: MediaStreamTrack;
  let mockVideoElement: HTMLVideoElement;
  let mockMediaStream: MediaStream;
  let createElementSpy: jest.SpyInstance;
  let requestAnimationFrameSpy: jest.SpyInstance;
  let cancelAnimationFrameSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock MediaStreamTrack
    mockTrack = {
      id: 'test-track-id',
      kind: 'video',
    } as MediaStreamTrack;

    // Mock MediaStream
    mockMediaStream = {
      getVideoTracks: jest.fn().mockReturnValue([mockTrack]),
    } as any;

    // Mock HTMLVideoElement
    mockVideoElement = {
      autoplay: false,
      muted: false,
      playsInline: false,
      srcObject: null,
      videoWidth: 640,
      videoHeight: 480,
      currentTime: 0,
      paused: true,
      ended: false,
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      load: jest.fn(),
    } as any;

    // Make read-only properties writable for testing
    Object.defineProperty(mockVideoElement, 'videoWidth', {
      writable: true,
      configurable: true,
      value: 640,
    });
    Object.defineProperty(mockVideoElement, 'videoHeight', {
      writable: true,
      configurable: true,
      value: 480,
    });
    Object.defineProperty(mockVideoElement, 'paused', {
      writable: true,
      configurable: true,
      value: true,
    });
    Object.defineProperty(mockVideoElement, 'ended', {
      writable: true,
      configurable: true,
      value: false,
    });

    // Mock document.createElement
    createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockVideoElement);

    // Mock MediaStream constructor
    global.MediaStream = jest.fn().mockImplementation(() => mockMediaStream) as any;

    // Mock requestAnimationFrame
    let rafIdCounter = 1;
    requestAnimationFrameSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        return rafIdCounter++ as any;
      });

    // Mock cancelAnimationFrame
    cancelAnimationFrameSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalMediaStream !== undefined) {
      global.MediaStream = originalMediaStream;
    } else {
      delete (global as any).MediaStream;
    }
  });

  describe('constructor', () => {
    it('creates video element with correct properties', () => {
      const source = new VideoSource(mockTrack);

      expect(source).toBeDefined();
      expect(createElementSpy).toHaveBeenCalledWith('video');
      expect(mockVideoElement.autoplay).toBe(true);
      expect(mockVideoElement.muted).toBe(true);
      expect(mockVideoElement.playsInline).toBe(true);
    });

    it('sets srcObject with MediaStream containing the track', () => {
      const source = new VideoSource(mockTrack);

      expect(source).toBeDefined();
      expect(global.MediaStream).toHaveBeenCalledWith([mockTrack]);
      expect(mockVideoElement.srcObject).toBe(mockMediaStream);
    });
  });

  describe('element getter', () => {
    it('returns the video element', () => {
      const source = new VideoSource(mockTrack);

      expect(source.element).toBe(mockVideoElement);
    });
  });

  describe('start', () => {
    it('calls play() on video element', async () => {
      const source = new VideoSource(mockTrack);
      const onFrame = jest.fn();

      await source.start(onFrame);

      expect(mockVideoElement.play).toHaveBeenCalled();
    });

    it('handles play() errors gracefully', async () => {
      const onFrame = jest.fn();
      const playError = new Error('Play failed');
      mockVideoElement.play = jest.fn().mockRejectedValue(playError);

      const source = new VideoSource(mockTrack);
      await source.start(onFrame);

      // Should not throw - error is caught and logged
      expect(mockVideoElement.play).toHaveBeenCalled();
    });

    it('uses requestVideoFrameCallback when available', async () => {
      const source = new VideoSource(mockTrack);
      const onFrame = jest.fn();
      let rvfcCallback: ((now: number, metadata: VideoFrameCallbackMetadata) => void) | null = null;
      let rvfcHandle = 1;

      // Mock requestVideoFrameCallback
      (mockVideoElement as any).requestVideoFrameCallback = jest.fn().mockImplementation((callback: any) => {
        rvfcCallback = callback;
        return rvfcHandle++;
      });

      await source.start(onFrame);

      expect((mockVideoElement as any).requestVideoFrameCallback).toHaveBeenCalled();
      expect(requestAnimationFrameSpy).not.toHaveBeenCalled();

      // Simulate callback invocation
      if (rvfcCallback) {
        (rvfcCallback as (now: number, metadata: VideoFrameCallbackMetadata) => void)(1000, {
          mediaTime: 1.5,
          expectedDisplayTime: 1000,
          width: 640,
          height: 480,
        } as any);
        expect(onFrame).toHaveBeenCalledWith(1.5, 640, 480);
      }
    });

    it('schedules next frame in requestVideoFrameCallback callback', async () => {
      const source = new VideoSource(mockTrack);
      const onFrame = jest.fn();
      let rvfcCallback: ((now: number, metadata: VideoFrameCallbackMetadata) => void) | null = null;
      let rvfcHandle = 1;
      const rvfcSpy = jest.fn().mockImplementation((callback: any) => {
        rvfcCallback = callback;
        return rvfcHandle++;
      });

      (mockVideoElement as any).requestVideoFrameCallback = rvfcSpy;

      await source.start(onFrame);

      // First call during start
      expect(rvfcSpy).toHaveBeenCalledTimes(1);

      // Simulate callback - should schedule next frame
      if (rvfcCallback) {
        (rvfcCallback as (now: number, metadata: VideoFrameCallbackMetadata) => void)(1000, {
          mediaTime: 1.5,
          expectedDisplayTime: 1000,
          width: 640,
          height: 480,
        } as any);
        expect(rvfcSpy).toHaveBeenCalledTimes(2);
      }
    });

    it('falls back to requestAnimationFrame when requestVideoFrameCallback not available', async () => {
      const source = new VideoSource(mockTrack);
      const onFrame = jest.fn();

      // Don't add requestVideoFrameCallback to video element
      await source.start(onFrame);

      expect(requestAnimationFrameSpy).toHaveBeenCalled();
    });

    it('calls onFrame with currentTime when using requestAnimationFrame', async () => {
      const source = new VideoSource(mockTrack);
      const onFrame = jest.fn();
      let rafCallback: FrameRequestCallback | null = null;

      requestAnimationFrameSpy.mockImplementation((callback: FrameRequestCallback) => {
        rafCallback = callback;
        return 1 as any;
      });

      mockVideoElement.currentTime = 2.5;

      await source.start(onFrame);

      // Simulate requestAnimationFrame callback
      if (rafCallback) {
        (rafCallback as FrameRequestCallback)(1000);
        expect(onFrame).toHaveBeenCalledWith(2.5, 640, 480);
      }
    });

    it('deduplicates frames when currentTime has not changed', async () => {
      const source = new VideoSource(mockTrack);
      const onFrame = jest.fn();
      let rafCallback: FrameRequestCallback | null = null;

      requestAnimationFrameSpy.mockImplementation((callback: FrameRequestCallback) => {
        rafCallback = callback;
        return 1 as any;
      });

      mockVideoElement.currentTime = 2.5;

      await source.start(onFrame);

      // First call - should trigger onFrame
      if (rafCallback) {
        (rafCallback as FrameRequestCallback)(1000);
        expect(onFrame).toHaveBeenCalledTimes(1);
      }

      // Second call with same currentTime - should NOT trigger onFrame
      if (rafCallback) {
        (rafCallback as FrameRequestCallback)(1001);
        expect(onFrame).toHaveBeenCalledTimes(1); // Still 1, not 2
      }

      // Third call with different currentTime - should trigger onFrame
      mockVideoElement.currentTime = 3.0;
      if (rafCallback) {
        (rafCallback as FrameRequestCallback)(1002);
        expect(onFrame).toHaveBeenCalledTimes(2);
        expect(onFrame).toHaveBeenLastCalledWith(3.0, 640, 480);
      }
    });

    it('uses videoWidth and videoHeight from video element', async () => {
      const source = new VideoSource(mockTrack);
      const onFrame = jest.fn();
      let rafCallback: FrameRequestCallback | null = null;

      requestAnimationFrameSpy.mockImplementation((callback: FrameRequestCallback) => {
        rafCallback = callback;
        return 1 as any;
      });

      Object.defineProperty(mockVideoElement, 'videoWidth', {value: 1280, writable: true, configurable: true});
      Object.defineProperty(mockVideoElement, 'videoHeight', {value: 720, writable: true, configurable: true});
      mockVideoElement.currentTime = 1.0;

      await source.start(onFrame);

      if (rafCallback) {
        (rafCallback as FrameRequestCallback)(1000);
        expect(onFrame).toHaveBeenCalledWith(1.0, 1280, 720);
      }
    });

    it('uses 0 for width/height when videoWidth/videoHeight are 0', async () => {
      const source = new VideoSource(mockTrack);
      const onFrame = jest.fn();
      let rafCallback: FrameRequestCallback | null = null;

      requestAnimationFrameSpy.mockImplementation((callback: FrameRequestCallback) => {
        rafCallback = callback;
        return 1 as any;
      });

      Object.defineProperty(mockVideoElement, 'videoWidth', {value: 0, writable: true, configurable: true});
      Object.defineProperty(mockVideoElement, 'videoHeight', {value: 0, writable: true, configurable: true});
      mockVideoElement.currentTime = 1.0;

      await source.start(onFrame);

      if (rafCallback) {
        (rafCallback as FrameRequestCallback)(1000);
        expect(onFrame).toHaveBeenCalledWith(1.0, 0, 0);
      }
    });

    it('continues requestAnimationFrame loop', async () => {
      const source = new VideoSource(mockTrack);
      const onFrame = jest.fn();
      let rafCallback: FrameRequestCallback | null = null;
      let rafCallCount = 0;

      requestAnimationFrameSpy.mockImplementation((callback: FrameRequestCallback) => {
        rafCallback = callback;
        rafCallCount++;
        return rafCallCount as any;
      });

      await source.start(onFrame);

      // Initial call
      expect(rafCallCount).toBe(1);

      // Simulate multiple animation frames
      if (rafCallback) {
        mockVideoElement.currentTime = 1.0;
        (rafCallback as FrameRequestCallback)(1000);
        expect(rafCallCount).toBe(2); // Should schedule next frame

        mockVideoElement.currentTime = 2.0;
        (rafCallback as FrameRequestCallback)(1001);
        expect(rafCallCount).toBe(3); // Should schedule next frame
      }
    });
  });

  describe('stop', () => {
    it('cancels requestVideoFrameCallback when active', async () => {
      const source = new VideoSource(mockTrack);
      const onFrame = jest.fn();
      const rvfcHandle = 1;
      const cancelRvfcSpy = jest.fn();

      (mockVideoElement as any).requestVideoFrameCallback = jest.fn().mockReturnValue(rvfcHandle);
      (mockVideoElement as any).cancelVideoFrameCallback = cancelRvfcSpy;

      await source.start(onFrame);
      source.stop();

      expect(cancelRvfcSpy).toHaveBeenCalledWith(rvfcHandle);
    });

    it('does not call cancelVideoFrameCallback when rVFCHandle is null', () => {
      const source = new VideoSource(mockTrack);
      const cancelRvfcSpy = jest.fn();

      (mockVideoElement as any).cancelVideoFrameCallback = cancelRvfcSpy;

      source.stop();

      expect(cancelRvfcSpy).not.toHaveBeenCalled();
    });

    it('cancels requestAnimationFrame when active', async () => {
      const source = new VideoSource(mockTrack);
      const onFrame = jest.fn();
      const rafId = 123;

      requestAnimationFrameSpy.mockReturnValue(rafId as any);

      await source.start(onFrame);
      source.stop();

      expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(rafId);
    });

    it('does not call cancelAnimationFrame when rafId is null', () => {
      const source = new VideoSource(mockTrack);

      source.stop();

      expect(cancelAnimationFrameSpy).not.toHaveBeenCalled();
    });

    it('pauses video if not paused and not ended', () => {
      const source = new VideoSource(mockTrack);
      Object.defineProperty(mockVideoElement, 'paused', {value: false, writable: true, configurable: true});
      Object.defineProperty(mockVideoElement, 'ended', {value: false, writable: true, configurable: true});

      source.stop();

      expect(mockVideoElement.pause).toHaveBeenCalled();
    });

    it('does not pause video if already paused', () => {
      const source = new VideoSource(mockTrack);
      Object.defineProperty(mockVideoElement, 'paused', {value: true, writable: true, configurable: true});
      Object.defineProperty(mockVideoElement, 'ended', {value: false, writable: true, configurable: true});

      source.stop();

      expect(mockVideoElement.pause).not.toHaveBeenCalled();
    });

    it('does not pause video if already ended', () => {
      const source = new VideoSource(mockTrack);
      Object.defineProperty(mockVideoElement, 'paused', {value: false, writable: true, configurable: true});
      Object.defineProperty(mockVideoElement, 'ended', {value: true, writable: true, configurable: true});

      source.stop();

      expect(mockVideoElement.pause).not.toHaveBeenCalled();
    });

    it('sets srcObject to null', () => {
      const source = new VideoSource(mockTrack);

      source.stop();

      expect(mockVideoElement.srcObject).toBeNull();
    });

    it('calls load() on video element', () => {
      const source = new VideoSource(mockTrack);

      source.stop();

      expect(mockVideoElement.load).toHaveBeenCalled();
    });

    it('resets rVFCHandle to null', async () => {
      const source = new VideoSource(mockTrack);
      const onFrame = jest.fn();
      const cancelRvfcSpy = jest.fn();

      (mockVideoElement as any).requestVideoFrameCallback = jest.fn().mockReturnValue(1);
      (mockVideoElement as any).cancelVideoFrameCallback = cancelRvfcSpy;

      await source.start(onFrame);
      source.stop();

      expect(cancelRvfcSpy).toHaveBeenCalledTimes(1);

      // Call stop again - should not try to cancel again (rVFCHandle is now null)
      cancelRvfcSpy.mockClear();
      source.stop();

      expect(cancelRvfcSpy).not.toHaveBeenCalled();
    });

    it('resets rafId to null', async () => {
      const source = new VideoSource(mockTrack);
      const onFrame = jest.fn();

      requestAnimationFrameSpy.mockReturnValue(123 as any);

      await source.start(onFrame);
      source.stop();

      // Call stop again - should not try to cancel again
      cancelAnimationFrameSpy.mockClear();
      source.stop();

      expect(cancelAnimationFrameSpy).not.toHaveBeenCalled();
    });

    it('performs all cleanup operations', async () => {
      const source = new VideoSource(mockTrack);
      const onFrame = jest.fn();

      // Use requestAnimationFrame path (not requestVideoFrameCallback)
      // Delete requestVideoFrameCallback so 'in' check returns false
      delete (mockVideoElement as any).requestVideoFrameCallback;
      requestAnimationFrameSpy.mockReturnValue(123 as any);
      Object.defineProperty(mockVideoElement, 'paused', {value: false, writable: true, configurable: true});
      Object.defineProperty(mockVideoElement, 'ended', {value: false, writable: true, configurable: true});

      await source.start(onFrame);
      source.stop();

      expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(123);
      expect(mockVideoElement.pause).toHaveBeenCalled();
      expect(mockVideoElement.srcObject).toBeNull();
      expect(mockVideoElement.load).toHaveBeenCalled();
    });
  });
});
